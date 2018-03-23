import React, {PureComponent} from 'react';

import styles from './styles.scss';
import {StaticTree} from './static-tree';
import {ExpandableTree} from './expandable-tree';
import {Checkbox} from './components';
import {cn} from './utils';

const compareById = ({id: {name: fName, parameters: fParameters}},
                     {id: {name: sName, parameters: sParameters}}) => fName.localeCompare(sName) || fParameters.length - sParameters.length;
const byFirst = ([first], [second]) => first.localeCompare(second);

const getSortedTypesEntries = (typesEntries) =>
  typesEntries
    .reduce((acc, [path, pathTypes]) => [
      ...acc,
      [
        path,
        pathTypes.slice().sort(compareById)
      ]
    ], [])
    .sort(byFirst);

const getSortedTypes = (types) => types.slice().sort(compareById);

const getFilteredTypes = (types, searchWord) => (
  searchWord ? (
    types.filter(({id: {name}}) => name.toLowerCase().indexOf(searchWord) === 0)
  ) : (
    types
  )
);

class Directories extends PureComponent {
  render() {
    const {typesEntries, modules, searchWord, declarations, nodeView} = this.props;

    return getSortedTypesEntries(typesEntries)
      .map(([path, pathTypes]) => {
        const filteredTypes = getFilteredTypes(pathTypes, searchWord);

        return filteredTypes.length ? (
          <div>
            <div className={styles.path}>
              {path}
            </div>
            <Types
              types={filteredTypes}
              declarations={declarations}
              nodeView={nodeView}
            />
            {
              modules[path] ? (
                <Modules
                  modules={modules[path]}
                  searchWord={searchWord}
                  declarations={declarations}
                  nodeView={nodeView}
                />
              ) : null
            }
          </div>
        ) : (null)
      })
  }
}

class Types extends PureComponent {
  render() {
    const {declarations, types, nodeView} = this.props;

    return types.map((type) => (
      <div className={styles.types}>
        {
          nodeView.flatMode ? (
            <StaticTree
              declarations={declarations}
              node={type}
              isRoot={true}
              nodeView={nodeView}
            />
          ) : (
            <ExpandableTree
              declarations={declarations}
              node={type}
              isRoot={true}
              nodeView={nodeView}
            />
          )
        }
      </div>
    ));
  }
}

class SortedTypes extends PureComponent {
  render() {
    const {types, searchWord, declarations, nodeView} = this.props;

    return (
      <Types
        types={getSortedTypes(getFilteredTypes(types, searchWord))}
        declarations={declarations}
        nodeView={nodeView}
      />
    );
  }
}

class Modules extends PureComponent {
  render() {
    const {
      modules, searchWord, declarations, nodeView
    } = this.props;

    const preparedModules = Object.entries(modules)
      .map(([name, types]) => [name, getSortedTypes(getFilteredTypes(types, searchWord))])
      .filter(([, types]) => types.length);

    return preparedModules.length ? (
      <div>
        {
          preparedModules.map(([name, types]) => {
            return (
              <div>
                <div className={styles.moduleName}>
                  {name}
                </div>
                <div className={styles.moduleBody}>
                  <Types
                    types={types}
                    declarations={declarations}
                    nodeView={nodeView}
                  />
                </div>
              </div>
            )
          })
        }
      </div>
    ) : null
  }
}

export class Root extends PureComponent {
  state = {
    searchWord: '',
    showDirectories: true,
    nodeView: {
      flatMode: false,
      flatIntersections: true,
      flatObjects: false
    },
    nestingVisualization: true,
  };

  changeNodeView(name, value) {
    this.setState({
      nodeView: {
        ...this.state.nodeView,
        [name]: value
      }
    })
  }

  renderHeader(allTypes) {
    const {
      searchWord,
      showDirectories,
      nestingVisualization,
      nodeView
    } = this.state;

    return (
      <div className={styles.header}>
        <div className={styles.toolbar}>
          Total count: {allTypes.length}
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            Search: <input autoFocus onChange={(e) => this.setState({searchWord: e.target.value.toLowerCase()})}/>
          </div>
          <div className={styles.verticalToolbar}>
            <Checkbox
              value={nodeView.flatMode}
              onChange={(value) => this.changeNodeView('flatMode', value)}
            >
              Flat mode
            </Checkbox>
            {/*            <div className={cn(styles.verticalToolbar, {[styles.hidden]: !nodeView.flatMode})}>
              <Checkbox
                value={nodeView.flatIntersections}
                onChange={(value) => this.changeNodeView('flatIntersections', value)}
              >
                Flat Intersections
              </Checkbox>
              <Checkbox
                value={nodeView.flatObjects}
                onChange={(value) => this.changeNodeView('flatObjects', value)}
              >
                Flat Objects
              </Checkbox>
            </div>*/}
          </div>
          <Checkbox
            value={showDirectories}
            onChange={(showDirectories) => this.setState({showDirectories})}
          >
            Show directories
          </Checkbox>
          <Checkbox
            value={nestingVisualization}
            onChange={(nestingVisualization) => this.setState({nestingVisualization})}
          >
            Nesting visualization
          </Checkbox>
        </div>
        {
          searchWord ? (
            <div className={styles.toolbar}>
              Found: {
              allTypes.filter(({id: {name}}) => name.toLowerCase().indexOf(searchWord) === 0).length
            }
            </div>
          ) : null
        }
      </div>
    )
  }

  render() {
    const {types, declarations, modules} = this.props;
    const {
      searchWord,
      showDirectories,
      nestingVisualization,
      nodeView
    } = this.state;
    const typesEntries = types ? Object.entries(types) : [];
    const modulesEntries = modules ? Object.entries(modules) : [];
    const modulesTypesEntries = modulesEntries
      .map(([path, module]) => Object.entries(module)
        .reduce((acc, [name, types]) => [...acc, ...types]), []);
    const allTypes = [
      ...modulesTypesEntries.reduce((acc, [path, pathTypes]) => acc.concat(pathTypes), []),
      ...typesEntries.reduce((acc, [path, pathTypes]) => acc.concat(pathTypes), [])
    ];

    return (
      <div className={styles.base}>
        {
          this.renderHeader(allTypes)
        }
        <div className={cn(
          styles.root, {
            [styles.nestingVisualization]: nestingVisualization
          }
        )}>
          {
            showDirectories ? (
              <Directories
                typesEntries={typesEntries}
                modules={modules}
                searchWord={searchWord}
                declarations={declarations}
                nodeView={nodeView}
              />
            ) : (
              <SortedTypes
                types={allTypes}
                searchWord={searchWord}
                declarations={declarations}
                nodeView={nodeView}
              />
            )
          }
          {
            !showDirectories && modulesEntries.length ? (
              modulesEntries.map(([, modules]) => (
                <Modules
                  modules={modules}
                  searchWord={searchWord}
                  declarations={declarations}
                  nodeView={nodeView}
                />
              ))
            ) : null
          }
        </div>
      </div>
    )
  }
}
