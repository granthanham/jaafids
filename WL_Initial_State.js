/* Obtaining Data
node ./src/get_pivot_data.js
node ./src/get_weekly_data.js

*/

// Import our utilities
var fs = require("fs");
function read(f) {
	return fs.readFileSync(f).toString();
}
function include(f) {
	eval.apply(global, [read(f)]);
}

include('./jaafids.js');

// import { of } from 'rxjs'; // possibility of 

// Load data
var dataWeekly = require('./data_weekly_newformat.json');
var dataPivot = require('./data_pivot.json');


// var dataCurrentWeek = filter(dataWeekly, {WeekStarting: maxOfAColumn(dataWeekly, 'WeekStarting')});


// Create a current week dataset from the weekly trend
// This will be slightly smaller than the pivot data

/*
print('Head');
print(names(dataWeekly));
print(names(dataPivot));

print('\nCount');
print(count(dataWeekly));
print(count(dataCurrentWeek));
print(count(dataPivot));
*/

var start = new Date().getTime();

var dataCurrentWeek = filter(dataWeekly, {WeekStarting: maxOfAColumn(dataWeekly, 'WeekStarting')});

var tt = filter(dataCurrentWeek, {DHB_of_service: ['Auckland'], 'Health Specialty': ['S00: General Surgery']});




var overviewDHB = 
mutate(sumMC(
	// data
	dataCurrentWeek
	// group by /sum
	, cols = ['waitlist_grouped', 'DHB_of_service'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	//mutate
	, '[Compliant]/([Compliant] + [NonCompliant])', '% Compliant');
	
	

// Best way to get total??
// Fastest use the pre grouped data -- this fits with using the filters
var overviewTotal = 
mutate(sumMC(
	// data
	overviewDHB
	// group by /sum
	, cols = ['waitlist_grouped'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	//mutate
	, '[Compliant]/[Total]', '% Compliant');
	

var overviewEthnicity = 
mutate(sumMC(
	// data
	dataCurrentWeek
	// group by /sum
	, cols = ['waitlist_grouped', 'Ethnicity'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	//mutate
	, '[Compliant]/[Total]', '% Compliant');




var weeklyTrendRegFSA = 
mutate(sumMC(filter(
	// data
	dataWeekly
	// filter
	, {waitlist_grouped: ['FSA']}
	)
	// group by /sum
	, cols = ['WeekStarting', 'waitlist_grouped'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	// , cols = ['WeekStarting'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	//mutate
	, '[Compliant]/[Total]', '% Compliant');


var weeklyTrendRegTreatment = 
mutate(sumMC(filter(
	// data
	dataWeekly
	// filter
	, {waitlist_grouped: ['Treatment']})
	// group by /sum
	, cols = ['WeekStarting', 'waitlist_grouped'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	// , cols = ['WeekStarting'], colsToSum = ['Compliant', 'NonCompliant', 'Total'])
	//mutate
	, '[Compliant]/[Total]', '% Compliant');



// Priority needs a wee think
// Top specialities also a think
// These are only by volume

var specRegFSA = 
// mutate(
	sumMC(filter(
	// data
	dataCurrentWeek
	// filter
	, {waitlist_grouped: ['FSA']})
	// group by /sum
	, cols = ['Health Specialty'], colsToSum = ['Total'])
	//mutate
	// , '[Compliant]/[Total]', '% Compliant')
	;

var specRegTreatment = 
// mutate(
	sumMC(filter(
	// data
	dataCurrentWeek
	// filter
	, {waitlist_grouped: ['Treatment']})
	// group by /sum
	, cols = ['Health Specialty'], colsToSum = ['Total'])
	//mutate
	// , '[Compliant]/[Total]', '% Compliant')
	;

var specRegFSAsort = 	specRegFSA.sort(function(a,b) {return b[1]-a[1]});
var specRegTreatmentsort = specRegTreatment.sort(function(a,b) {return b[1]-a[1]});
//  function to sort and head = 3

var overviewTopFSA = head(specRegFSA.sort(function(a,b) {return b[1]-a[1]}), n = 3);
var overviewTopTreatment = head(specRegTreatment.sort(function(a,b) {return b[1]-a[1]}), n = 3);


var specDHBFSA = 
// mutate(
	sumMC(filter(
	// data
	dataCurrentWeek
	// filter
	, {waitlist_grouped: ['FSA']})
	// group by /sum
	, cols = ['DHB_of_service','Health Specialty'], colsToSum = ['Total'])
	//mutate
	// , '[Compliant]/[Total]', '% Compliant')
	;

var specDHBTreatment = 
// mutate(
	sumMC(filter(
	// data
	dataCurrentWeek
	// filter
	, {waitlist_grouped: ['Treatment']})
	// group by /sum
	, cols = ['DHB_of_service','Health Specialty'], colsToSum = ['Total'])
	//mutate
	// , '[Compliant]/[Total]', '% Compliant')
	;

// specRegFSA.sort(function(a,b) {return b[1]-a[1]});
// specRegTreatment.sort(function(a,b) {return b[1]-a[1]});
// Sort function to include multiple columns - basically sort multiple times in reverse sequence
// Trap for numeric and string values
// also include a descending order use a multiplier of -1 (quick) test speed
// and take care of custom sort orders - piece of cake
var specDHBFSAsort = 	specDHBFSA.sort(function(a,b) {return b[2]-a[2]});
var specDHBTreatmentsort = specDHBTreatment.sort(function(a,b) {return b[2]-a[2]});

// var specDHBFSAsort = 	specDHBFSAsort.sort(function(a,b) {return b[0]-a[0]});
// var specDHBTreatmentsort = specDHBTreatmentsort.sort(function(a,b) {return b[0]-a[0]});
var specDHBTreatmentsort = specDHBTreatmentsort.sort(function(a,b) {if (a[0] > b[0]) {
    return 1;
  }
  if (a[0] < b[0]) {
    return -1;
  }
  return 0;});



/*
var overviewPriority = 
sumMC(
	// data
	dataPivot
	// group by /sum
	, cols = ['Waitlist Type','Priority'], colsToSum = ['RowCount'])
	;
*/	

  var priorityRegFSA = 
//   mutate(
	  sumMC(filter(
	  // data
	  dataPivot
	  // filter
	  , {'Waitlist Type': ['FSA']})
	  // group by /sum
	  , cols = ['Waitlist Type','Priority'], colsToSum = ['RowCount'])
	  //mutate
	//   , '[compliance_met_count]/[RowCount]', '% Compliant')
	  ;

var priorityRegFSATotal = sumMC(priorityRegFSA, ['Waitlist Type'], colsToSum = ['RowCount']);

  var priorityRegTreatment = 
//   mutate(
	  sumMC(filter(
	  // data
	  dataPivot
	  // filter
	  , {'Waitlist Type': ['Treatment']})
	  // group by /sum
	  , cols = ['Waitlist Type','Priority'], colsToSum = ['RowCount'])
	  //mutate
	//   , '[compliance_met_count]/[RowCount]', '% Compliant')
	  ;


var priorityRegTreatmentTotal = sumMC(priorityRegTreatment, ['Waitlist Type'], colsToSum = ['RowCount']);


// print(pull(priorityRegTreatmentTotal, 'RowCount')) // 21393
// print(pull(priorityRegTreatment, 'RowCount')) // [11472, 3007, 5030, 1884]



// pull(priorityRegTreatment, 'RowCount') // [11472, 3007, 5030, 1884]
var Test_pull = addColumn(priorityRegFSA, pull(priorityRegFSA, 'RowCount'), 'new column');
// console.log(Test_pull)

// addColumn(priorityRegTreatment, ['1', '2'], 'Total')
priorityRegTreatment = addColumn(priorityRegTreatment, pull(priorityRegTreatmentTotal, 'RowCount'), 'Total');
priorityRegFSA = addColumn(priorityRegFSA, pull(priorityRegFSATotal, 'RowCount'), 'Total');


priorityRegFSA = mutate(priorityRegFSA, '[RowCount]/[Total]', '% of Total'); 
priorityRegTreatment = mutate(priorityRegTreatment, '[RowCount]/[Total]', '% of Total'); 

// Put this into a function
// orderBy
// trap for numbers v strings
// add in option for desc

print('Function Version');

/*
print(orderBy(priorityRegFSA, 'Priority'));

print(orderBy(overviewEthnicity, 'Ethnicity'));

overviewEthnicity = orderBy(overviewEthnicity, 'Waitlist Type')
print(overviewEthnicity)

overviewEthnicity = orderBy(overviewEthnicity, 'Ethnicity')
print(overviewEthnicity)

overviewEthnicity = orderBy(overviewEthnicity, 'Waitlist Type')
print(overviewEthnicity)

// print(orderBy(orderBy(overviewEthnicity, 'Ethnicity'), 'Waitlist Type'));
*/
// print(orderBy(overviewDHB, 'DHB_of_service'));
overviewEthnicity = orderBy(overviewEthnicity, 'Ethnicity');

priorityRegTreatment = orderBy(priorityRegTreatment, 'Priority');
priorityRegFSA = orderBy(priorityRegFSA, 'Priority');


/*
var header = priorityRegFSA.shift()
priorityRegFSA = priorityRegFSA.sort(function(a,b) {if (a[1] > b[1]) {
	return 1;
	}
	if (a[1] < b[1]) {
	return -1;
	}
	return 0;});
priorityRegFSA.unshift(header)

var header = priorityRegTreatment.shift()
priorityRegTreatment = priorityRegTreatment.sort(function(a,b) {if (a[1] > b[1]) {
	return 1;
	}
	if (a[1] < b[1]) {
	return -1;
	}
	return 0;});
priorityRegTreatment.unshift(header)

*/

var end = new Date().getTime();
var aaMSTimeToCalc = end - start;
/*
let inarr = pull(overviewEthnicity, 'Ethnicity'); // this already removes the header in the process
let colToOrder = 'Ethnicity'

let mapped = inarr.map((v, i) => {
	return { i, value: refCustomSortOrder[colToOrder][v] };
});

// sort mapped
mapped.sort((a, b) => {
	if (a.value > b.value) {
	  return 1;
	}
	if (a.value < b.value) {
	  return -1;
	}
	return 0;
});

print(mapped);

var header = overviewEthnicity.shift()

out = [];
for (let index = 0; index < mapped.length; index++) {
	var element = mapped[index];
	print(element);
	print(element['i']);
	// print(element['value']);
	out[index] = overviewEthnicity[element['i']];
	// out[element['value']] = overviewEthnicity[element['i']];
}
overviewEthnicity.unshift(header)
out.unshift(header)

print(out);
*/

/*
// orderBy(overviewEthnicity, 'Ethnicity'));
let inarr = pull(overviewEthnicity, 'Ethnicity'); // this already removes the header in the process
// also allow desc
function orderBy(df, colToOrder, asc = 'asc') {
	// the array to be sorted
	let inarr = pull(df, colToOrder); // this already removes the header in the process
	// determine if we need custom sorting or not
	if(refCustomSortOrder[colToOrder]){
		// temporary array holds objects with position and sort-value
		mapped = inarr.map((v, i) => {
			return { i, value: refCustomSortOrder[colToOrder][v] };
		})
	} else {
	// Not a custom sort considering seeing if the values are string or numeric - see what happens
		mapped = inarr.map((v, i) => {
			return { i, value: v };
		})
	};
	print(mapped);
	mapped.sort((a, b) => {
		if (a.value > b.value) {
		  return 1;
		}
		if (a.value < b.value) {
		  return -1;
		}
		return 0;
	});
	// let sorted =  mapped.map(v => inarr[v.i]);
	// return sorted;
	var header = df.shift()
	let sorted =  mapped.map(v => df[v.i]);
	return sorted.unshift(header)
}

*/






// Better way of getting the values
print(select(filter(overviewTotal, {waitlist_grouped: ['FSA']}), ['Total'])[1]);
print(select(filter(overviewTotal, {waitlist_grouped: ['FSA']}), ['NonCompliant'])[1]);
print(select(filter(overviewTotal, {waitlist_grouped: ['FSA']}), ['% Compliant'])[1]);
print(select(filter(overviewTotal, {waitlist_grouped: ['Treatment']}), ['Total'])[1]);
print(select(filter(overviewTotal, {waitlist_grouped: ['Treatment']}), ['NonCompliant'])[1]);
print(select(filter(overviewTotal, {waitlist_grouped: ['Treatment']}), ['% Compliant'])[1]);

var ttfilterWithAgg = filterWithAgg(dataCurrentWeek, {DHB_of_service: ['Metro'], 'Health Specialty': ['S00: General Surgery']});




/*
var distinct = count(dataPivot, ['ComplianceMetNotMet', 'Waitlist Type', 'Health Specialty', 'DHB of Domicile', 'WeekStarting', 'total_days_waiting_atweekstarting', 'HEALTH_SPECIALTY_CODE', 'Ethnicity', 'DHB of Service', 'Priority', 'AgeBand', 'compliance_met_count', 'compliance_not_met_count', 'RowCount']);
print(count(distinct));
65716  compared with 72506
*/




