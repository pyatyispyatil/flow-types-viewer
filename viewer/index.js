import React from 'react';
import ReactDOM from 'react-dom';

import {Root} from './root';


ReactDOM.render(
  <Root
    types={DATA.parsed.types}
    declarations={DATA.parsed.declarations}
    modules={DATA.parsed.modules}
    builtins={DATA.builtins}
  />,
  document.getElementById('root')
);
