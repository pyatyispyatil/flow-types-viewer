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


class Node extends Component {
  getAssets(assetedNode) {
    const {parameters, args, node, parent} = this.props;

    const constructedParameters = args ? args
      .reduce((acc, arg, index) => Object.assign(
        acc, {
          [node.parameters[index].name]: arg
        }), {}) : parameters;

    return {
      node: (constructedParameters && constructedParameters[assetedNode.name]) || assetedNode,
      parent: args ? assetedNode : parent,
      parameters: constructedParameters
    }
  }

  render() {
    const {node, render} = this.props;
    const declaration = getDeclaration(node);

    switch (node.type) {
      case 'type':
        if (declaration) {
          return render(this.getAssets(declaration));
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
              {render(Object.assign(this.getAssets(declaration), {args: node.value}))}
            </div>
          )
        } else {
          return (
            <div className={styles.typeGeneric}>
              {node.genericName + '<'}
              {
                node.value.map((val) => render(this.getAssets(val)))
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
                <div className={styles.typeUnionItem}>| {render(this.getAssets(val))}</div>
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
                  render(Object.assign(this.getAssets(val), {className: styles.typeIntersectionItem}))
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
                    <div className={styles.typeObjectIndexKey}>[{render(this.getAssets(index.key))}]</div>
                    : {render(Object.assign(this.getAssets(index.value), {className: styles.typeObjectIndexValue}))}
                  </div>
                ))
              }
              {
                node.value.map((val) => (
                  <div className={styles.typeObjectProp}>
                    <div className={styles.typeObjectKey}>{val.key}</div>
                    : {render(Object.assign(this.getAssets(val), {className: styles.typeObjectValue}))}
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
}

class WrapNode extends Component {
  state = {
    collapsed: true
  };

  handleClick = () => this.setState({collapsed: !this.state.collapsed});

  render() {
    const {node, children, className} = this.props;
    const {collapsed} = this.state;

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
                    {children}
                  </div>
                ) : null}
              </div>
            </Fragment>
          ) : (children)
        }
      </div>
    )
  }
}

class ExpandableTree extends Component {
  renderNode = () => {
    return <Node
      {...this.props}
      render={(props) => <ExpandableTree {...props}/>}
    />;
  };

  render() {
    const {node, className} = this.props;

    return (
      <WrapNode className={className} node={node}>
        {this.renderNode()}
      </WrapNode>
    )
  }
}

class StaticTree extends Component {
  flatItems = (items) => items.reduce((acc, item) => {
    if (item.type === 'type') {
      const declaration = getDeclaration(item);

      if (declaration) {
        return acc.concat(...(
          declaration.type === 'intersection' ? this.flatItems(declaration.value) : declaration.value
        ));
      }
    } else if (item.type === 'object' && item.value) {
      return acc.concat(...item.value.map(this.expandDeclarations));
    } else {
      return acc.concat(item);
    }

    return acc;
  }, []);

  expandDeclarations = (node) => {
    return Object.assign({}, node, node.type === 'intersection' ? {
      value: node && node.value && Array.isArray(node.value) ? this.flatItems(node.value) : null,
      indexers: [],
      type: 'object'
    } : {});
  };

  renderNode = (props) => {
    const {node, genericStack = []} = props || this.props;

    if (!node) {
      return null;
    }

    if (!genericStack.includes(node.name)) {
      if (node.type === 'generic') {//ToDo: recursive handling
        genericStack.push(node.name);
      }

      return (
        <Node
          {...this.props}
          node={this.expandDeclarations(node)}
          render={(props) => <StaticTree {...props} genericStack={genericStack}/>}
        />
      );
    } else {
      return <div>{node.name}</div>;
    }
  };

  render() {
    const {isRoot, node, className} = this.props;

    if (isRoot) {
      return (
        <WrapNode className={className} node={node}>
          {this.renderNode()}
        </WrapNode>
      );
    } else {
      return this.renderNode();
    }
  }
}

class Root extends Component {
  state = {
    searchWord: '',
    flatMode: false
  };

  render() {
    const {searchWord, flatMode} = this.state;

    return (
      <div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            Search: <input autoFocus onChange={(e) => this.setState({searchWord: e.target.value.toLowerCase()})}/>
          </div>
          <div className={styles.checkbox}>
            <input
              className={styles.checkboxInput}
              id="flatMode"
              type="checkbox"
              onChange={(e) => this.setState({flatMode: !this.state.flatMode})}
            />
            <label htmlFor="flatMode">Flat mode</label>
          </div>
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
                        {
                          flatMode ? (
                            <StaticTree node={type} isRoot={true}/>
                          ) : (
                            <ExpandableTree node={type} isRoot={true}/>
                          )
                        }
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