## flow-types-viewer

Creates an abstract tree view, that encompasses all types in given files and all dependent and built in types

#### Installation
```
npm i flow-types-viewer -g
```

#### Usage
```
flow-types-viewer [options] [dir] <dirs...>
```

##### Usage examples
First usage:
```
flow-types-viewer ./types -v -b -o ./docs
```
Rebuild data for viewer
```
flow-types-viewer ./types -b -o ./docs
```

#### Options
```
    -V, --version                   output the version number
    [dir] <dirs...>                 parse the given directories and files
    -t, --text                      output result to text in console
    -j, --json <jsonPath>           output the processed flow types to json along the given path
    -v, --viewer                    build viewer
    -b, --builtins                  create abstract tree of builtin types (dom, bom, etc)
    -o, --output [outputDirectory]  path where the build and flow types data will be (default: ./flow-types-viewer/)
    -h, --help                      output usage information
```

#### Examples

Builtin types: https://gloooom.github.io/flow-types-viewer
