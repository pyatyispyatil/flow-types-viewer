#!/usr/bin/env node

"use strict";

const program = require('commander');
const packageJson = require('./package.json');
const run = require('./parser/cli');

program
  .version(packageJson.version)
  .description('Creates an abstract tree type viewer that encompasses all type dependencies')
  .option('[dir] <dirs...>', 'parse the given directories and files')
  .option('-t, --text', 'output result to text in console', false)
  .option('-j, --json <jsonPath>', 'output the processed flow types to json along the given path')
  .option('-v, --viewer', 'build viewer', false)
  .option('-b, --builtins', 'create abstract tree of builtins types (dom, bom, etc)')
  .option('-o, --output [outputDirectory]', 'path where the build and flow types data will be', './flow-types-viewer/')
  .action(run);

program.parse(process.argv);
