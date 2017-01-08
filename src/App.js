import React, { Component } from 'react';
import 'whatwg-fetch';
import { parse } from 'babyparse'
import { parameters } from './config/parameters';
import { presets } from './config/presets';
import { inputs } from './config/inputs';
import toCamelCase from './auxiliary/toCamelCase'
import { transform } from './transformers/transform';
import TableContainer from './app/TableContainer';

class App extends Component {
  constructor(props) {
      super(props);
      this.state = { status: 'loading' };

      if (!props.csv) {
          this.setState({
              status: 'error',
              errorMessage: 'Please specify csv file using data-csv attribute'
          });
          return;
      }

      Object.assign(this.state, this.getConfig(props));
  }

  getConfig (props) {
      const configObject = {};
      Object.keys(parameters).forEach(key => configObject[key] = parameters[key].default);

      if (props.preset) {
          if (presets.hasOwnProperty(props.preset)) {
              Object.assign(configObject, presets[props.preset])
          } else {
              console.log(`No ${props.preset} preset for now, sorry about that. Moving on with the default settings.`)
          }
      }

      Object.keys(props)
          .filter(key => !['csv', 'preset', 'style', 'parameters'].includes(key))
          .map(key => toCamelCase(key))
          .forEach(key => {
              if (!parameters.hasOwnProperty(key)) {
                  return console.log(`Sorry, there is no ${key} parameter available. Ignoring it and moving on.`);
              }

              const value = parameters[key].hasOwnProperty('parse') ? parameters[key].parse(props[key]) : props[key];
              if (parameters[key].validate(value)) {
                  configObject[key] = value;
              } else {
                  console.log(`Sorry, we cannot accept ${props[key]} as ${key}. Moving on with the default value which is ${JSON.stringify(configObject[key])}`);
              }
          });

      const inputModes = inputs[configObject['inputType']]['modes'];
      const modes = configObject['modes'] ? configObject['modes'].filter(mode => inputModes.includes(mode)) : inputModes;
      configObject['modes'] = modes.map(mode => ({ value: mode, label: configObject[mode + 'Name'] }));
      configObject.roundMode = inputs[configObject['inputType']].roundMode;

      return configObject;
  }

  parseCSV (path) {
      return fetch(path)
          .then(response => response.text())
          .then(csv => parse(csv))
          .then(json => {
              if(json.errors.length !== 0) {
                  return {
                      status: 'error',
                      errorMessage: 'Parsing csv file failed\n' +  json.errors.map(error => error.message).join('\n')
                  };
              }

              return {
                  status: 'success',
                  data: json.data
              };
          })
          .catch(error => {
              return {
                  status: 'error',
                  errorMessage: 'Fetching csv file failed\n' + error
              };
          });
  }

  componentDidMount() {
      if (this.state.status === 'error') {
          return;
      }

      Promise.resolve(this.parseCSV(this.props.csv))
          .then(result => {
              if (result.status === 'error') {
                  this.setState({
                      status: 'error',
                      errorMessage: result.errorMessage
                  });
                  return;
              }

              const params = Object.keys(parameters)
                  .filter(key => parameters[key].goesToTransform)
                  .reduce((obj, key) => Object.assign(obj, { [key]: this.state[key] }), {});

              const transformedResult = transform(this.state['inputType'], result.data, params );
              if (transformedResult.status === 'error') {
                  this.setState({
                      status: 'error',
                      errorMessage: 'Transformation failed\n' + result.errorMessage
                  });
                  return;
              }

              ['itemName', 'roundsNames', 'extraColumnsNames', 'extraColumns']
                  .filter(param => !this.state[param] && transformedResult[param])
                  .forEach(param => this.setState({ [param]: transformedResult[param]}));

              const lastRound = transformedResult.resultsTable
                  .filter(round => [...round.results.values()].some(result => result.change !== null))
                  .reduce((maxIndex, round) => Math.max(round.meta.index, maxIndex), 0);
              this.setState({ lastRound: lastRound });

              if (!this.state['startFromRound']) {
                  this.setState({ startFromRound: lastRound})
              }

              this.setState({
                  status: 'success',
                  resultsTable: transformedResult.resultsTable
              });
          })
          .catch(error => {
              this.setState({
                  status: 'error',
                  errorMessage: error
              });
          });
  }

  render() {
      switch (this.state.status) {
          case 'loading':
              return <p>Loading...</p>;
          case 'error':
              return <p>An error occured. {this.state.errorMessage}</p>;
          default:
              return <TableContainer {...(this.state)} />;
      }
  }
}

export default App;
