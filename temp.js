/* const allListItems =[[], [], []];

const allListItems2 =[[{name: 'a'}], [{name: 'b'}], [{name: 'c'}]];


const listItemNames = allListItems.map(listItems => {
    return listItems.map(listItem => listItem.name);
}); // This should give us an array of subarrays. Each subarray carries the list item names of one list. The index of the list in listTitles should match up with the index of the subarray.

const listItemNames2 = allListItems2.map(listItems => {
    return listItems.map(listItem => listItem.name);
}); // This should give us an array of subarrays. Each subarray carries the list item names of one list. The index of the list in listTitles should match up with the index of the subarray.

console.log(listItemNames);
console.log(listItemNames2); */



// Import js libraries 
const dayjs = require('dayjs'); // For manipulating date/time

const now = dayjs();
const expiry = dayjs().add(1, 'minute');
console.log(now.format(), expiry.format());
console.log(expiry.diff(now));
console.log(60*1000);