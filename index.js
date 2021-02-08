#!/usr/bin/env node 

require('yargs/yargs')(process.argv.slice(2)).command(
    {
        command: '$0 <inputOpenApiSpec> <outputRapiseRestPath> [baseUrl]',
        desc: 'Convert OpenAPI spec to Rapise .rest file',
        builder: (yargs) => {
            yargs.positional('inputOpenApiSpec', {
                describe: 'Path to OpenAPI .json or .yaml',
                type: 'string'
            }).positional('outputRapiseRestPath', {
                describe: 'path to output .rest file',
                type: 'string'
            }).positional('baseUrl', {
                describe: 'default server URL (to use for baseUrl)',
                type: 'string'
            }).option('verbose', {
                alias: 'v',
                type: 'boolean',
                description: 'Run with verbose logging'
            })
        },
        handler: (argv) => {
            convert(argv.inputOpenApiSpec, argv.outputRapiseRestPath, argv.baseUrl, argv.verbose);
        }
    })
  .help()
  .wrap(72)
  .argv;


function postman2rapise(inpFileOrObj, baseUrl)
{
    var fs=require('fs');
    var jp=require('jsonpath');
    var path=require('path');
    
    // https://www.npmjs.com/package/jsonpath
    
    var outObj = false;

    var j = null;
    if(typeof(inpFileOrObj)=='string')
    {
        j = JSON.parse(fs.readFileSync(inpFileOrObj));
    } else {
        j = inpFileOrObj;
        outObj = true;
    }

    
    var f = jp.paths(j, '$..request');
    
    var rrest = {
        Name:"Name",
        BaseName:"BaseName",
        Requests:[]
    };
    
    function makeUrl(req, url)
    {
        var urlStr = url.host[0];
        if(url.path) url.path.forEach((p,i)=>{
            if(p.startsWith(":"))
            {
                var pn = p.substr(1);
                var varVal = "";
                // get default value form variable def, if any
                if(url.variable) url.variable.forEach((v)=>{
                        if(v.key==pn && v.value) varVal = v.value;
                    }
                );
                req.Parameters.push({
                    Name: pn,
                    TokenName: "{"+pn+"}",
                    Value: ""
                });
                urlStr += "/{"+pn+"}";
            } else {
                urlStr += "/"+p+"";
            }
        });
        if(url.query&&url.query.length)
        {
            urlStr+="?";
            var sep = "";
            url.query.forEach(
                (q,i)=>{
                    urlStr+=sep+q.key+"="+q.value;
                    sep = "&";
                }
            );
        }
        req.Url = urlStr;
        return urlStr;
    }
    
    
    jp.nodes(j, '$..request').forEach(
        (node)=>{
            console.log("Request: ", node.value.name, ' (', jp.stringify(node.path), ')');
            
            var nv = node.value;
            var req = {
                Parameters:[],
                Headers:[]
            };
    
            if(j.variable)
            {
                j.variable.forEach(
                    (v)=>{
                        var defVal = v.value;
                        if(v.id=='baseUrl') defVal = baseUrl || defVal;
                        req.Parameters.push(
                            {
                                Name: "{"+v.id+"}",
                                TokenName: "{{"+v.id+"}}",
                                Value: defVal
                            }
                        );
                    }
                );
            }
    
            req.Name = node.value.name.replace(/[^A-Za-z0-9_]/ig,'_');
            req.Url = makeUrl(req, node.value.url)
            req.Method = nv.method;
    
    
            if(nv.header) nv.header.forEach((h)=>req.Headers.push({Name:h.key, Value:h.value}));
    
            if(nv.body && nv.body.raw)
            {
                req.Body = nv.body.raw;
            } else if(nv.body && nv.body.urlencoded )
            {
                req.Body = "";
                sep = "";
                nv.body.urlencoded.forEach((u)=>{req.Body+=sep+u.key+"="+u.value;sep="&"});
            }
    
            if(nv.auth &&  nv.auth.type=="bearer")
            {
                req.Headers.push({Name:"Authorization",Value:"Bearer <token>"});
            } else if(nv.auth &&  nv.auth.type=="oauth2")
            {
                req.Headers.push({Name:"Authorization",Value:"<token>"});
            }

    
            rrest.Requests.push(req);
        }
    );

    return rrest;
}

function convert(inputJson, outputRest, baseUrl, bVerbose)
{
    var oapiPath = inputJson;
    outputRest = outputRest || path.join(path.dirname(oapiPath), path.basename(oapiPath, path.extname(oapiPath)) + '.rest');

    var fs = require('fs');
    var path = require('path');
    var Converter = require('openapi-to-postmanv2');
    
    if(!fs.existsSync(oapiPath))
    {
        console.log('Input file not found: ', oapiPath);
        process.exit(-1);
    }

    var options = {
        // schemaFaker: true,
        // requestNameSource: 'fallback',
        // indentCharacter: ' '
      };
    
    Converter.convert(
        { type: 'file', data:  oapiPath}, 
        options, 
        (err, conversionResult) => {
            if (!conversionResult.result) {
                console.log('Could not convert', conversionResult.reason);
                process.exit(-2);
            }
            else {
                var postmanData = conversionResult.output[0].data;
                if(bVerbose)
                {
                    var pmPath = outputRest+'.pm.json';
                    fs.writeFileSync(pmPath, JSON.stringify(conversionResult.output[0].data, null, '\t'));
                    console.log('Writing intermediate postman file to: ', pmPath);    
                }
                var rrest = postman2rapise(postmanData, baseUrl);
                rrest.Name = path.basename(outputRest);
                rrest.BaseName = path.basename(outputRest, path.extname(outputRest));
                fs.writeFileSync(outputRest, JSON.stringify(rrest, null, '\t'));
            }
        });
    
}

