import React, {Fragment, PureComponent} from 'react';
import Autocomplete from 'react-autocomplete';

import styles from './styles.scss';
import {StaticTree} from './static-tree';
import {ExpandableTree} from './expandable-tree';
import {Checkbox} from './components';
import {cn, cutRoot} from './utils';

const compareById = ({id: {name: fName, typeParameters: fParameters = []}},
                     {id: {name: sName, typeParameters: sParameters = []}}) => fName.localeCompare(sName) || fParameters.length - sParameters.length;

const byFirst = ([first], [second]) => first.localeCompare(second);

const getModulesOrTypesByName = (modules, searchName) => Object.entries(modules)
  .filter(([name, types]) => (
    name.toLowerCase().indexOf(searchName.toLowerCase()) === 0
  ) || (
    types.some(({id: {name}}) => name.toLowerCase().indexOf(searchName.toLowerCase()) === 0)
  ));

const getSortedTypesEntries = (typesEntries) =>
  typesEntries
    .map(([path, pathTypes]) =>
      [
        path,
        getSortedTypes(pathTypes)
      ]
    )
    .sort(byFirst);

const getSortedTypes = (types) => types.slice().sort(compareById);

const getFilteredTypes = (types, searchWord) => (
  searchWord ? (
    types.filter(({id: {name}}) => name.toLowerCase().indexOf(searchWord.toLowerCase()) === 0)
  ) : (
    types
  )
);

class Modules extends PureComponent {
  render() {
    const {
      modules, searchWord, declarations, builtins, nodeView, entries
    } = this.props;

    const preparedModules = searchWord ? (
      (entries || Object.entries(modules))
        .map(([name, types]) => [name, getSortedTypes(getFilteredTypes(types, searchWord))])
        .filter(([, types]) => types.length)
    ) : (
      entries || Object.entries(modules)
    );

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
                    builtins={builtins}
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

class Directory extends PureComponent {
  state = {
    collapsed: true
  };

  render() {
    const {modules, declarations, builtins, searchWord, nodeView, path, types, title, forceOpen} = this.props;
    const {collapsed} = this.state;
    const preparedModulesEntries = modules[path] && getModulesOrTypesByName(modules[path], searchWord);

    return (
      <div>
        <div className={cn(styles.path, {
          [styles.collapsed]: collapsed && !forceOpen
        })} onClick={() => this.setState({collapsed: !collapsed})}>
          {title}
        </div>
        {
          !collapsed || forceOpen ? (
            <Fragment>
              <Types
                types={types}
                declarations={declarations}
                builtins={builtins}
                nodeView={nodeView}
              />
              {
                preparedModulesEntries && preparedModulesEntries.length ? (
                  <Modules
                    entries={preparedModulesEntries}
                    declarations={declarations}
                    searchWord={searchWord}
                    builtins={builtins}
                    nodeView={nodeView}
                  />
                ) : null
              }
            </Fragment>
          ) : null}
      </div>
    )
  }
}

class Directories extends PureComponent {
  render() {
    const {entries, modules, searchWord, declarations, builtins, nodeView} = this.props;
    const filteredEntries = entries
      .map(([path, pathTypes]) => [path, getFilteredTypes(pathTypes, searchWord)])
      .filter(([path, pathTypes]) => (
        pathTypes.length
      ) || (
        modules[path] && getModulesOrTypesByName(modules[path], searchWord).length
      ));
    const paths = filteredEntries.map(([path]) => path);
    const rootlessPaths = cutRoot(paths);

    return filteredEntries
      .map(([path, pathTypes], index, entries) => (
          <Directory
            key={path}
            modules={modules}
            searchWord={searchWord}
            declarations={declarations}
            builtins={builtins}
            nodeView={nodeView}
            title={rootlessPaths[index]}
            path={path}
            types={pathTypes}
            forceOpen={entries.length === 1}
          />
        )
      )
  }
}

class Types extends PureComponent {
  render() {
    const {declarations, builtins, types, nodeView} = this.props;

    return types.map((type) => (
      <div className={styles.types}>
        {
          nodeView.flatMode ? (
            <StaticTree
              key={type.id && type.id.name}
              declarations={declarations}
              builtins={builtins}
              node={type}
              isRoot={true}
              nodeView={nodeView}
            />
          ) : (
            <ExpandableTree
              key={type.id && type.id.name}
              declarations={declarations}
              builtins={builtins}
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
    cache: {
      sortedTypes: [],
      allTypes: [],
      modulesEntries: [],
      sortedTypesEntries: []
    }
  };

  componentDidMount() {
    this.cacheData(this.props);
  }

  componentWillReceiveProps(props) {
    this.cacheData(props);
  }

  cacheData({types, modules}) {
    const typesEntries = types ? Object.entries(types) : [];
    const modulesEntries = modules ? Object.entries(modules) : [];
    const modulesTypesEntries = modulesEntries
      .map(([path, module]) => Object.entries(module)
        .reduce((acc, [name, types]) => [...acc, ...types]), []);
    const sortedTypes = getSortedTypes(typesEntries.reduce((acc, [path, pathTypes]) => acc.concat(pathTypes), []));
    const allTypes = getSortedTypes([
      ...modulesTypesEntries.reduce((acc, [path, pathTypes]) => acc.concat(pathTypes), []),
      ...sortedTypes
    ]);
    const sortedTypesEntries = getSortedTypesEntries(typesEntries);

    this.setState({
      cache: {
        allTypes,
        sortedTypes,
        modulesEntries,
        sortedTypesEntries
      }
    })
  }

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
      nestingVisualization
    } = this.state;

    return (
      <div className={styles.header}>
        <div className={styles.toolbar}>
          Total count: {allTypes.length}
        </div>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            Search: <Autocomplete
            autoFocus
            onChange={(e) => this.setState({searchWord: e.target.value})}
            shouldItemRender={({id: {name}}, value) => name.toLowerCase().indexOf(value.toLowerCase()) > -1}
            getItemValue={({id: {name}}) => name}
            items={allTypes}
            renderItem={(item, isHighlighted) =>
              <div style={{background: isHighlighted ? 'lightgray' : 'white'}}>
                {item.id.name}
              </div>
            }
            value={searchWord}
            onSelect={(val) => this.setState({searchWord: val})}
          />
          </div>
          {/*          <div className={styles.verticalToolbar}>
            <Checkbox
              value={nodeView.flatMode}
              onChange={(value) => this.changeNodeView('flatMode', value)}
            >
              Flat mode
            </Checkbox>
            <div className={cn(styles.verticalToolbar, {[styles.hidden]: !nodeView.flatMode})}>
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
            </div>
          </div>*/}
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
    const {declarations, modules, builtins, loading} = this.props;
    const {
      searchWord,
      showDirectories,
      nestingVisualization,
      nodeView,
      cache: {
        allTypes,
        modulesEntries,
        sortedTypesEntries,
        sortedTypes
      }
    } = this.state;

    return (
      <div className={styles.base}>
        {
          this.renderHeader(allTypes)
        }
        {
          loading ? (
            <div className={styles.loader}>Loading...</div>
          ) : (
            <div className={cn(
              styles.root, {
                [styles.nestingVisualization]: nestingVisualization
              }
            )}>
              {
                showDirectories ? (
                  <Directories
                    entries={sortedTypesEntries}
                    modules={modules}
                    searchWord={searchWord}
                    declarations={declarations}
                    builtins={builtins}
                    nodeView={nodeView}
                  />
                ) : (
                  <Types
                    types={getFilteredTypes(sortedTypes, searchWord)}
                    declarations={declarations}
                    builtins={builtins}
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
                      builtins={builtins}
                      nodeView={nodeView}
                    />
                  ))
                ) : null
              }
            </div>
          )
        }
      </div>
    )
  }
}
