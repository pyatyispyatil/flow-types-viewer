import React, {Component} from 'react';
import ReactDOM from 'react-dom';

class TreeItem extends Component {
  render() {
    return (
      <div>
      </div>
    )
  }
}

class Tree extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {collapsed} = this.state;
    const {node, declarations} = this.props;

    return (
      <div className={'tree-view'}>
        <div className={'tree-view_item'}>
          <div onClick={this.handleClick}/>
          {node.name}
        </div>
        <div>
          {collapsed ? null : <Tree/>}
        </div>
      </div>
    );
  }
}

ReactDOM.render((
  <div>
    {
      DATA.types.map((type) => <Tree node={type} declarations={DATA.declarations}/>)
    }
  </div>
), document.getElementById('root'));