#!/usr/bin/env node

"use strict";

const program = require('commander');
const packageJson = require('./package');
const run = require('./parser/cli');

program
  .version(packageJson.version)
  .description('Creates an abstract tree type viewer that encompasses all type dependencies')
  .option('[dir] <dirs...>', 'parse the given directories and files')
  .option('-t, --text', 'output result to text in console', false)
  .option('-j, --json [json path]', 'output the processed flow types to json along the given path')
  .option('-v, --viewer', 'build viewer', false)
  .option('--builtins', 'create abstract tree of builtins types (dom, bom, etc)')
  .option('-b, --buildDir [build directory]', 'path where the build and flow types data will be', './flow-types-viewer/')
  .action(run);

program.parse(process.argv);
