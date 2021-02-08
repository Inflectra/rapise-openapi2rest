# rapise-openapi2rest

Convert OpenAPI definition to Rapise .rest file. The result of the conversion is a template - you will have to tweak it more to get good endpoint definition for testing.

## Installation

```
npm install -g https://github.com/Inflectra/rapise-openapi2rest.git
```

## Usage
```
openapi2rapise <inputOpenApiSpec> <outputRapiseRestPath> [baseUrl]

Convert OpenAPI spec to Rapise .rest file

Positionals:
  inputOpenApiSpec      Path to OpenAPI .json or .yaml          [string]
  outputRapiseRestPath  path to output .rest file               [string]
  baseUrl               default server URL (to use for baseUrl) [string]

Options:
      --version  Show version number                           [boolean]
      --help     Show help                                     [boolean]
  -v, --verbose  Run with verbose logging                      [boolean]
```

## Example

```
openapi2rapise petstore3.yaml petstore3.rest https://petstore3.swagger.io/api/v3 --v
```