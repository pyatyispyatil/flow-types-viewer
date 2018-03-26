import React, {PureComponent} from 'react';
import ReactDOM from 'react-dom';

import {Root} from './root';
import axios from 'axios';


class Loader extends PureComponent {
  state = {
    loading: true
  };

  componentDidMount() {
    axios.get('data.json').then(({data}) => {
      window.data = data;
      this.setState({data, loading: false})
    });
  }

  render() {
    const {
      data: {
        parsed: {
          types = [],
          declarations = {},
          modules = {}
        } = {},
        builtins = {}
      } = {},
      loading
    } = this.state;

    return (
      <Root
        types={types}
        declarations={declarations}
        modules={modules}
        builtins={builtins}
        loading={loading}
      />
    );
  }
}

ReactDOM.render(<Loader/>, document.getElementById('root'));
