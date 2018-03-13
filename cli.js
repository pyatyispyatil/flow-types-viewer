#!/usr/bin/env node

"use strict";

const argv = process.argv.slice(2);

require('./parser/cli')(argv);
