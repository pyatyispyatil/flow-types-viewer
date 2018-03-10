import React, {Component, Fragment} from 'react';
import ReactDOM from 'react-dom';

import styles from './styles.scss';

//https://youtrack.jetbrains.com/issue/WEB-21774
const cs = '{';
const ce = '}';

const getDeclaration = (node) => DATA.declarations[node.declarationId];

const cn = (...objs) => objs
  .filter(Boolean)
  .map((obj) => typeof obj !== 'string' ? (
    Object.entries(obj)
      .map(([key, value]) => value ? key : '')
      .filter(Boolean)
      .join(' ')
  ) : obj)
  .join(' ');

class TreeNode extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  getAssets(assetedNode) {
    const {parameters, args, node} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [node.parameters[index].name]: arg
        }), {}) : parameters;

    return {
      node: (constructedParameters && constructedParameters[assetedNode.name]) || assetedNode,
      parameters: constructedParameters
    }
  }

  renderNode() {
    const {node} = this.props;
    const declaration = getDeclaration(node);

    switch (node.type) {
      case 'type':
        if (declaration) {
          return <TreeNode {...this.getAssets(declaration)}/>;
        } else {
          return <div className={styles.typeDeclaration}>{node.name}</div>
        }
      case 'generic':
        if (declaration && node.value) {
          return (
            <div className={styles.typeParametrizedGeneric}>
              <div className={styles.typeParametrizedGenericName}>
              {node.name}
              </div>
              <TreeNode {...this.getAssets(declaration)} args={node.value}/>
            </div>
          )
        } else {
          return (
            <div className={styles.typeGeneric}>
              {node.genericName + '<'}
              {
                node.value.map((val) => <TreeNode {...this.getAssets(val)}/>)
              }
              {'>'}
            </div>
          );
        }
      case 'union':
        return (
          <div>
            {
              node.value.map((val) => (
                <div className={styles.typeUnionItem}>| <TreeNode {...this.getAssets(val)}/></div>
              ))
            }
          </div>
        );
      case 'intersection':
        return (
          <div className={styles.typeIntersection}>
            {
              node.value
                .map((val) => (
                  <TreeNode className={styles.typeIntersectionItem} {...this.getAssets(val)}/>
                ))
            }
          </div>
        );
      case 'object':
        return (
          <div className={styles.typeObject}>
            {cs}
            <div className={styles.typeObjectChildren}>
              {
                node.indexers.map((index) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectIndex}>[<TreeNode {...this.getAssets(index.key)}/>]</div>
                    : <TreeNode {...this.getAssets(index.value)}/>
                  </div>
                ))
              }
              {
                node.value.map((val) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectKey}>{val.key}</div>
                    : <TreeNode className={styles.typeObjectValue} {...this.getAssets(val)}/>
                  </div>
                ))
              }
            </div>
            {ce}
          </div>
        );
      case 'primitive':
        return node.value;
      case 'stringLiteral':
        return `"${node.value}"`;
      default:
        return node.value || 'unhandled';
    }
  }

  render() {
    const {collapsed} = this.state;
    const {node, className} = this.props;

    return (
      <div className={cn(styles.treeView, className)}>
        {
          node.name && !node.declarationId && (!node.builtin || node.genericName !== node.name) ? (
            <Fragment>
              <div className={styles.nodeTitle} onClick={this.handleClick}>
                {node.name}
                {node.parameters ? (
                  `<${node.parameters.map(({name}) => name).join(', ')}>`
                ) : null}
              </div>
              <div className={cn(styles.nodeChildrenWrapper, {[styles.expanded]: !collapsed})}>
                {!collapsed && node.value ? (
                  <div className={styles.nodeChildren}>
                    {this.renderNode()}
                  </div>
                ) : null}
              </div>
            </Fragment>
          ) : (this.renderNode())
        }
      </div>
    )
  }
}

class Root extends Component {
  state = {
    searchWord: ''
  };

  render() {
    const {searchWord} = this.state;

    return (
      <div>
        <div className={styles.search}>
          Search: <input autoFocus onChange={(e) => this.setState({searchWord: e.target.value.toLowerCase()})}/>
        </div>
        {
          Object.entries(DATA.types)
            .map(([path, types]) => {
              const filteredTypes = searchWord ? types.filter(({name}) => name.toLowerCase().indexOf(searchWord) === 0) : types;

              return filteredTypes.length ? (
                <div>
                  <div className={styles.path}>
                    {path}
                  </div>
                  {
                    filteredTypes.map((type) => (
                      <div className={styles.rootType}>
                        <TreeNode node={type}/>
                      </div>
                    ))
                  }
                </div>
              ) : (null)
            })
        }
      </div>
    )
  }
}

ReactDOM.render(<Root/>, document.getElementById('root'));