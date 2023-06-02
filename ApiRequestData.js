
var HTTPGetClient = function(){
    this.get = function(asyncURL){
        return new Promise(function(resolve, reject) {
            var asyncHTTPRequest = new XMLHttpRequest();
            asyncHTTPRequest.onreadystatechange = function(){
                if(asyncHTTPRequest.readyState != 4){ return; } 
                if(asyncHTTPRequest.status != 200) { reject(new Error('Request failed with status ' + asyncHTTPRequest.status)); }
                
                resolve(asyncHTTPRequest.responseText);         
            };
            asyncHTTPRequest.open("GET", asyncURL, true);
            asyncHTTPRequest.send(null);
        });
    };
};

var HTTPPosttClient = function(){
    this.post = function(asyncURL, data){
        return new Promise(function(resolve,reject) {
            var asyncHTTPRequest = new XMLHttpRequest();
            asyncHTTPRequest.onreadystatechange = function(){
                if(asyncHTTPRequest.readyState != 4){ return; }
                if(asyncHTTPRequest.status != 200) { reject(new Error('Request failed with status ' + asyncHTTPRequest.status)) };
                
                resolve(asyncHTTPRequest.responseText);   
            }

            asyncHTTPRequest.open("POST",asyncURL,true);
            asyncHTTPRequest.setRequestHeader("Content-Type", "application/json");
            asyncHTTPRequest.setRequestHeader("Accept", "application/json");
            asyncHTTPRequest.send(data);
        });
    }
}

var getClient = new HTTPGetClient();
var postClient = new HTTPPosttClient();

async function GasData(searchData){
    let data = JSON.stringify({
    "operationName": "LocationBySearchTerm",
    "variables": {
        "maxAge": 0,
        "search": searchData
    },
    "query": "query LocationBySearchTerm($brandId: Int, $cursor: String, $maxAge: Int, $search: String) { locationBySearchTerm(search: $search) { stations(brandId: $brandId, cursor: $cursor, maxAge: $maxAge) { count cursor { next } results {  address { country line1 line2 locality postalCode region }  fuels id name prices { cash { nickname posted_time price } credit { nickname posted_time price } } } } trends { areaName country today todayLow trend } }}"
    });

    let proxy = "https://corsproxy.io/?";
    let url = proxy + "https://www.gasbuddy.com/graphql";
    let gasData = await postClient.post(url, data);

    gasData = JSON.parse(gasData);
    //console.log(gasData.data.locationBySearchTerm.stations.results);
    //console.log(gasData.data.locationBySearchTerm.trends);
    return gasData.data.locationBySearchTerm;
}

const quicksort = (arr,fuelType) => {
    if(arr.length <= 1){
        return arr;
    }

    let pivot = arr[0]; // first element is by default the pivot
    let leftArr = [];
    let rightArr = [];
    // ^ set up for divide n conquer 
    
    for(let i = 1; i < arr.length; i++){
        if(arr[i].prices[fuelType].credit.price < pivot.prices[fuelType].credit.price 
            && arr[i].prices[fuelType].credit.price != 0)
            leftArr.push(arr[i]);
        else
            rightArr.push(arr[i]);
    }

    return [...quicksort(leftArr,fuelType), pivot, ...quicksort(rightArr,fuelType)];
};

const formInput = document.querySelector("#gasDataInput");
const formInputFilter = document.querySelector("#fuelTypes");
const locationInput = document.querySelector(".searchInput");
const formOutput = document.querySelector("#gasDataOutput");
const currency = (country) => { return (country == 'US') ? "$" : "¢"; }
var fuelType = 0;

formInputFilter.addEventListener("change", async function(event){
    event.preventDefault();
    fuelType = event.target.selectedIndex;
    
    /*
    let gasData = await GasData(locationInput.value);
    let sortedStationByPrices = quicksort(gasData.stations.results,fuelType);
    createNavigation(sortedStationByPrices); */
});

formInput.addEventListener("submit", async function (event) {
    // stop from submission
    event.preventDefault();
    if(locationInput){
        const gasData = await GasData(locationInput.value);
        updateGasTrends(gasData.trends[0])
        const sortedStationByPrices = quicksort(gasData.stations.results,fuelType);
        createNavigation(sortedStationByPrices);
    }else{
        alert("please enter a location");
    }
});

function updateGasTrends(trends) {
    const trendsOutput = formOutput.parentNode.querySelector(".trendsOutput");
    trendsOutput.textContent = 
    `Average gas price in ${trends.areaName} for today is ${trends.today}${currency(trends.country)}. 
    Lowest gas price in ${trends.areaName} for today is ${trends.todayLow}${currency(trends.country)}.`;
}

function createNavigation(sortedStations){
    const output = formOutput.parentNode.querySelector(".stationsOutputNavigation");
    while(output.hasChildNodes()) { output.removeChild(output.firstChild); }
    const topBestPrices = 3;
    for(let i = 0; i < topBestPrices; i++){
        const station = sortedStations[i];
        const { name, address, prices } = station;
        const { line1, locality, region, country } = address;
        const button = document.createElement('button');
        const queryLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name}, ${line1}, ${locality}, ${region}`)}`;
        button.classList.add("stationInfoNav");
        button.href = queryLink;
        button.textContent = `${name} ${line1} ${prices[fuelType].credit.price}${currency(country)}`;
        button.addEventListener("click", () => {
            window.location.href = button.href;
        });
        output.appendChild(button);
    }
}