import React from 'react';
import ReactDOM from 'react-dom';

import {Root} from './root';


ReactDOM.render(
  <Root
    types={DATA.types}
    declarations={DATA.declarations}
  />,
  document.getElementById('root')
);