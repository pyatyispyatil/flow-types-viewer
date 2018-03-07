import React, {Component} from 'react';
import ReactDOM from 'react-dom';


class Tree extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  renderNode() {
    const {node} = this.props;

    switch (node.type) {
      case 'type':
        return <Tree node={DATA.declarations[node.declarationId]}/>;
      case 'intersection':
        return (
          <div>
            {node.value.map((item) => (
              <Tree node={item}/>
            ))}
          </div>
        );
      case 'object':
        return (
          <div>
            {'{'}
            {node.value.map(({value, name}) => (
              <div>
              {`${name}: `}
              <Tree node={value}/>
              </div>
              ))
            }
            {'}'}
          </div>
        );
      case 'primitive':
        return node.value;
      default:
        return 'unhandled';
    }
  }

  render() {
    const {collapsed} = this.state;
    const {node} = this.props;

    return (
      node.name ? (
        <div>
          <div className={'tree-view_item'} onClick={this.handleClick}>
            {node.name}
          </div>
          <div>
            {collapsed ? null : this.renderNode()}
          </div>
        </div>
      ) : (this.renderNode())
    )
  }
}

ReactDOM.render((
  <div>
    {
      DATA.types.map((type) => <Tree node={type}/>)
    }
  </div>
), document.getElementById('root'));