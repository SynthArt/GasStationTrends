
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
    console.log(gasData.data.locationBySearchTerm.stations.results);
    console.log(gasData.data.locationBySearchTerm.trends);
    return gasData.data.locationBySearchTerm;
}

/*
async function ZipToLatLong(zipCode){
    let params = "zip=" + zipCode + "&key=17o8dysaCDrgvlc";
    let url = "https://api.promaptools.com/service/us/zip-lat-lng/get/";
    let dataJson = await getClient.get(url+"?"+params); 
    
    dataJSON = JSON.parse(dataJson);
    let lat = dataJSON.output[0].latitude;
    let long = dataJSON.output[0].longitude;
    return[lat, long];
}


async function dataHandler(locationValue){
    const [gasData, latlong] = await Promise.allSettled([GasData(locationValue), ZipToLatLong(locationValue)]);
    if(gasData.status == 'fulfilled' && latlong.status == 'fulfilled') {
        return [gasData.value, latlong.value];
    }
}
*/

function showMessage(input, message){
    const msg = input.parentNode.querySelector("#average-low-data-control");
    console.log(message);
    msg.innerHTML = message;
}

const quicksort = (arr) => {
    if(arr.length <= 1){
        return arr;
    }

    let pivot = arr[0]; // first element is by default the pivot
    let leftArr = [];
    let rightArr = [];
    // ^ set up for divide n conquer 

    for(let i = 1; i < arr.length; i++){
        if(arr[i].prices[0].credit.price < pivot.prices[0].credit.price && arr[i].prices[0].credit.price != 0)
            leftArr.push(arr[i]);
        else
            rightArr.push(arr[i]);
    }

    return [...quicksort(leftArr), pivot, ...quicksort(rightArr)];
};

const currency = (country) => {
    return (country == 'US') ? "$" : "¢";
}

const formInput = document.querySelector("#gasDataInput");
const formOutput = document.querySelector("#gasDataOutput");
formInput.addEventListener("submit", function (event) {
    // stop from submission
    event.preventDefault();
    // validate form 
    let location = formInput.elements[0]; // maybe redundant?
    if(location){
        const outputParent = formOutput.parentNode.querySelector(".stationsOutputNavigation");
        const trends = formOutput.parentNode.querySelector(".trendsOutput");

        GasData(location.value).then((result) => {
            
            /* create trends text */
            trends.textContent = createTrends(result.trends[0]);
            /* create station buton navigation */
            let sortedStationByPrices = quicksort(result.stations.results);
            createNavigation(sortedStationByPrices, outputParent);
            console.log(result);
        });
    }else{
        alert("error");
    }
});

function createTrends(trends) {
    return "Average gas price in " + trends.areaName + " for today is " + trends.today + currency(trends.country) + ". " +
    "Lowest gas price in " + trends.areaName + " for today is " + trends.todayLow + currency(trends.country); 
}

function createNavigation(sortedNavArr, output){
    while(output.hasChildNodes()) { output.removeChild(output.firstChild); }
    let topBestPrices = 3;
    for(let i = 0; i < topBestPrices; i++){
        let station = sortedNavArr[i];
        let button = document.createElement('button');
        let location = station.address;
        let queryLink = 'https://www.google.com/maps/search/?api=1&query=' + station.name + "%2C " + location.line1.replace(/\s/g,'+') 
        + "%2C " + location.locality + "%2C " + location.region;
        
        button.setAttribute('class','stationInfoNav');
        button.setAttribute('href',queryLink);
        button.textContent = station.name + " " + location.line1 + " " + station.prices[0].credit.price + currency(location.country);
        button.addEventListener("click", navigateListener);

        output.appendChild(button);
    }
}

function navigateListener(event){
    let element = event.target;
    document.location.href = element.getAttribute('href'); // "https://www.google.com/maps/search/?api=1&query=1702%20SW%208th%20ST";
}

// curl --request POST --header "content-type: application/json" 
// --url "https://www.gasbuddy.com/graphql" --data "@gasStationSearchPackage.json"
// curl -X POST --url "https://charts.gasbuddy.com/ch.gaschart?Country=USA&Crude=t&Period=1&Areas=Miami%2CUSA%2CAverage%2C&Unit=US%20%24%2FG" --output "output.png"