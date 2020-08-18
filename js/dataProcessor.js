import { parse } from "../node_modules/@vanillaes/csv/index.js";

const MY_STATE = "Minnesota";
const GROUPING_SIZE = 10000;
const COVID_COUNTY_COL = 5;
const COVID_STATE_COL = 6;
const POP_STATE_COL = 5
const POP_COUNTY_COL = 6
const POP_NUM_PEOPLE_COL = 18

var parsedCovidCsv = [];
var parsedPopulationCsv = [];
var countyNames = [];
var dict = {};

window.addEventListener('load', () => {

  getCountyPopulationData();
  getCovidCaseData();

});

async function getCountyPopulationData() {
  var csv = new XMLHttpRequest();

  csv.onreadystatechange = function () {
    if (csv.status == 200 && csv.readyState == 4) {
      parsedPopulationCsv = parse(csv.responseText);
      processPopulationData();
      createCountyDropDown();
    }
  }

  csv.open("GET", "https://cors-anywhere.herokuapp.com/https://www2.census.gov/programs-surveys/popest/datasets/2010-2019/counties/totals/co-est2019-alldata.csv", true);

  csv.send();
}

function processPopulationData() {
console.log('population data happening ' + Date.now())
  for (let i = 0; i < parsedPopulationCsv.length; i++) {

    var countyData = parsedPopulationCsv[i];

    if (countyData[POP_STATE_COL] == MY_STATE && countyData[POP_COUNTY_COL] != MY_STATE) {
      var countyName = countyData[POP_COUNTY_COL].split(" County", 1)[0];

      countyNames.push(countyName);

      var newCounty = {};

      var population = countyData[POP_NUM_PEOPLE_COL];

      if (!isNaN(population)) {
        population = parseInt(population, 10);
        newCounty.population = population;
      } else {
        newCounty.population = 0;
      }

      if (dict.hasOwnProperty(countyName)) {
        dict[countyName] = { ...dict[countyName], ...newCounty };
      } else {
        dict[newCounty.countyName] = newCounty;
      }
    }
  }
}

function createCountyDropDown() {
  var dropDown = document.getElementById('counties');
  for (let i = 0; i < countyNames.length; i++) {

    dropDown[dropDown.length] = new Option(countyNames[i], countyNames[i]);
  }
}

function getCovidCaseData() {
  var csv = new XMLHttpRequest();

  csv.onreadystatechange = function () {
    if (csv.status == 200 && csv.readyState == 4) {
      parsedCovidCsv = parse(csv.responseText);
      processCovidCaseData();
    }
  };

  csv.open("GET", "https://raw.githubusercontent.com/CSSEGISandData/COVID-19/master/csse_covid_19_data/csse_covid_19_time_series/time_series_covid19_confirmed_US.csv", true);

  csv.send();
}

function processCovidCaseData() {
  console.log('covid data happening ' + Date.now())
  const startDate = parsedCovidCsv[0][parsedCovidCsv[0].length - 14]; 
  const endDate = parsedCovidCsv[0][parsedCovidCsv[0].length - 1];

  for (let i = 0; i < parsedCovidCsv.length; i++) {
    if (parsedCovidCsv[i][COVID_STATE_COL] == MY_STATE) {

      var countyData = parsedCovidCsv[i];

      var newCounty = {};

      newCounty.state = MY_STATE;
      newCounty.countyName = countyData[COVID_COUNTY_COL];
      newCounty.startDate = startDate;
      newCounty.endDate = endDate;

      var totalCases = countyData[countyData.length - 1] - countyData[countyData.length - 15];

      if (totalCases < 0) {
        totalCases = 0;
      }

      newCounty.recentCases = totalCases;

      if (dict.hasOwnProperty(newCounty.countyName)) {
        dict[newCounty.countyName] = { ...dict[newCounty.countyName], ...newCounty };
      } else {
        dict[newCounty.countyName] = newCounty;
      }
    }
  }
}

function addCases(county) {

  var total = 0;

  for (let i = county.length - 1; i > county.length - 15; i--) {

    let today = county[i] - county[i - 1];

    if (today > 0) {
      total = total + today;
    }
  }

  return total;
}

window.addEventListener('change', (e) => {

  if (e.target.id === 'counties') {
    var countiesDropdown = document.getElementById('counties');
    var userSelectedCounty = countiesDropdown.options[countiesDropdown.selectedIndex].text;
    if (countyNames.includes(userSelectedCounty)) {
      getCountyCovidData(userSelectedCounty);
    }
  }
});

function getCountyCovidData(userSelectedCounty) {
  var parentDiv = document.getElementById('covidData');
  var wrapper = document.getElementById('dataWrapper');

  while(parentDiv.firstChild) {
    parentDiv.removeChild(parentDiv.lastChild);
  }

  if (!countyNames.includes(userSelectedCounty)) {
    var errorMessage = 'There was an error. Please refresh the page.';
    createNewElement(parentDiv, 'p', 'error', errorMessage);
    parentDiv.classList = 'errorData';
    return;
  }

  var selectedCountyData = dict[userSelectedCounty];

  var groupingsPerCounty = selectedCountyData.population / GROUPING_SIZE;

  var county = "County: " + userSelectedCounty;

  if (groupingsPerCounty > 0) {

    var casesPerGrouping = selectedCountyData.recentCases / groupingsPerCounty;
    casesPerGrouping = casesPerGrouping.toFixed(2);

    var learningType = caseModel(casesPerGrouping);

    var numberOfCases = "Number of cases per " + formatNumber(GROUPING_SIZE) + " people: " + casesPerGrouping;
    var dateRange = "Cases over the previous 14 days from " + selectedCountyData.startDate + " to " + selectedCountyData.endDate;
    var schoolModel = "Calculated learning model: " + learningType;

    createNewElement(parentDiv, 'p', 'selectedCount', county);
    createNewElement(parentDiv, 'p', 'caseQuantity', numberOfCases);
    createNewElement(parentDiv, 'p', 'dateRange', dateRange);
    createNewElement(parentDiv, 'p', 'learningModel', schoolModel);

    parentDiv.classList = 'caseData';
    wrapper.classList = 'populated';

  } else {
    var message = 'Cannot calculate cases due to missing population data.';
    var reloadPage = 'Please refresh the page.';
    createNewElement(parentDiv, 'p', 'selectedCount', county);
    createNewElement(parentDiv, 'p', 'warningMessage', message);
    createNewElement(parentDiv, 'p', 'reloadMessage', reloadPage);
    parentDiv.classList = 'errorData';
  }
}

function caseModel(casesPerGrouping) {

  const MESSAGE_50 = 'Distance learning for all students';
  const MESSAGE_30 = 'Hybrid learning for all elementary students; distance learning for secondary students';
  const MESSAGE_20 = 'Hybrid learning for all students';
  const MESSAGE_10 = 'In-person learning for all elementary students; hybrid learning for secondary students';
  const MESSAGE_ALL = 'In-person learning for all students';


  return casesPerGrouping >= 50 ? MESSAGE_50 :
    casesPerGrouping >= 30 ? MESSAGE_30 :
    casesPerGrouping >= 20 ? MESSAGE_20 :
    casesPerGrouping >= 10 ? MESSAGE_10 :
    MESSAGE_ALL;
}

function createNewElement(parent, elementType, idName, text) {

  var newElement = document.createElement(elementType);
  newElement.setAttribute('id', idName);
  newElement.innerHTML = text;
  parent.append(newElement);
}

function formatNumber(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}
