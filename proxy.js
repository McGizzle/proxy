const PORT = 9000;
const HOST = "localhost";
const NO_CACHE = 'no-cache';
const LOGS = ['logs','logs/http','logs/https'];
const http_start = "********** HTTP Log Proxy Started **********\n\r";
const https_start = "********** HTTPS Log Proxy Started **********\n\r";
const http_end = "\n\r\n\r********** HTTP Log Proxy Ended **********\n\r";
const https_end = "\n\r\n\r********** HTTPS Log Proxy Ended **********\n\r";
const newCon = "New Connection Established:";
var dir = new Date().toJSON().slice(0,10).replace(/-/g,'-').toString();
var http = require("http");
var u = require("url");
var net = require('net');
var util = require('util');
var fs = require('fs');
var rl = require('readline');
var jsonfile = require('jsonfile');
var buffer = require('buffer').Buffer;

console.log("eftwdkmol,")

for (var i = 0, len = LOGS.length; i < len; i++) {
    if (!fs.existsSync(LOGS[i])){
        fs.mkdirSync(LOGS[i]);
    }
}
var http_log = fs.createWriteStream('logs/http/'+dir,{flags: 'a'})
http_log.write(http_start+'\r\n');
var https_log =  fs.createWriteStream('logs/https/'+dir,{flags: 'a'})
https_log.write(https_start+'\r\n');

function blacklist_load(url){
    console.log("wtf")
    fs.readFile('blacklist.json', function(err, content){
        if(err){
            console.log(err)
            return;
        }
        else{
            console.log("checked bl")
            bl = JSON.parse(content);
            if(bl[url]){
                return true;
            }
            return false;
        }
    });
}


function IsJsonString(str) {
    try {
        JSON.parse(str);
    } catch (e) {
        console.log("ERROR:"+e);
        return false;
    }
    return true;
}

function cacheData(url,data){

    var file = fs.readFileSync('cache/data.json')
    if(file.toString().length===0){
        var cacheMap = {};
    }
    else{
        var cacheMap = JSON.parse(fs.readFileSync('cache/data.json'));
    }
    if(!!cacheMap[url]){
        return;
    }
    cacheMap[url] = {"cachedata":data};

    if(IsJsonString(JSON.stringify(cacheMap[url]))){
        fs.writeFileSync('cache/data.json', JSON.stringify(cacheMap));
    }

}

function cacheHeaders(header,status,urlString){
    var file = fs.readFileSync('cache/headers.json')
    if(file.toString().length===0){
        var cacheMap = {};
    }
    else{
        var cacheMap = JSON.parse(fs.readFileSync('cache/headers.json'));
    }
    if(!!cacheMap[urlString]){
        return;
    }
    cacheMap[urlString] = {"header":header,"status":status.toString()};

    if(IsJsonString(JSON.stringify(cacheMap[urlString]))){
        fs.writeFileSync('cache/headers.json', JSON.stringify(cacheMap));
    }
    else{
        return;
    }
}

/*
	The Server that listens to the port and makes requests
*/


var proxy = http.createServer(function(req,res){
    console.log("here???")
    var url = req.url;
    var {hostname,host,port,path} = u.parse(url);
    var headers = req.headers;
    var method = req.method;
    var body =[];

    var file = fs.readFileSync('cache/headers.json')
    var file2 = fs.readFileSync('cache/data.json')
    console.log("SERVER STARTED");


    if(blacklist_load(url)){
        res.writeHead(404);
        res.statusCode = 404;
        res.end("<h1><center>ERROR: This website is on the blacklist</center></h1>");
        http_log.write("Access attempted to blacklist domain: "+ hostname+"\r\n");
        return;
    }

    if((file.toString().length !== 0) && (file2.toString().length !== 0)){
        var cacheHead = JSON.parse(fs.readFileSync('cache/headers.json'));
        var cacheD = JSON.parse(fs.readFileSync('cache/data.json'));
        if((!!cacheHead[url]) && (!!cacheD[url]))
        {
            console.log("Loaded from cache ["+url+"]");
            // var b = JSON.stringify(cacheD[url].cachedata[0]);
            // var buff = new buffer(JSON.parse(b));
            var b = cacheD[url].cachedata[0];
            var buff = new buffer(b);
            cacheHead[url].header['content-length'] = buff.length;
            res.writeHead(cacheHead[url].status,cacheHead[url].header);
            res.write(buff);
            res.end();
            return;
        }
    }

    req.on('error', function(err){
        console.error('ERROR: '+err);
        res.statusCode = 404;
        res.end("Error pal");
    });
    req.on('data',function(chunk){
        body.push(chunk);
    });
    var options = {
      hostname: hostname,
      port: port,
      path: path,
      method: method,
      headers: headers
    };

    http.request(options, function(pRes){
    http_log.write(newCon+'\r\n');
    http_log.write('Proxy connected to ['+url+']'+'\r\n');
    http_log.write(`STATUS: ${pRes.statusCode}`+'\r\n');
    res.writeHead(pRes.statusCode,pRes.headers);
    var cacheDataString=[];


    if(pRes.headers.pragma!=NO_CACHE && pRes.headers["cache-control"]!=NO_CACHE){
        cacheHeaders(pRes.headers,pRes.statusCode,url);
    }

    pRes.on('data', (chunk) => {
    	cacheDataString.push(chunk);
        res.write(chunk);

    });
    pRes.on('end',()=>{

        if( pRes.headers.pragma!=NO_CACHE && cacheDataString.length!=0 && pRes.headers["cache-control"]!=NO_CACHE){
            cacheData(url,cacheDataString);
        }
        http_log.write('No more data to transmit.'+'\r\n\r\n');
        res.end();
    });
    }).end();

}).listen(PORT);

/*
	For HTTPS, the request is proxied and not re-written
*/

proxy.on('connect', function(req,socket,bodyhead){
    https_log.write(newCon+'\r\n');
    var url = req.url.toString();
    var info = url.split(':');
    var hostDomain =info[0];
    var hostArr = hostDomain.split('.');
    var hostname = hostArr[1] + '.' + hostArr[2];
    var proxySocket = new net.Socket();
    // if(block(hostname)==true){
    //     https_log.write("Access attempted to blacklist domain: "+ hostname+"\r\n\r\n");
    //     return;
    // }

    var port = info[1];
    https_log.write("Proxying HTTPS request for: "+ hostDomain + ", " + port+'\r\n'+'\r\n');

    proxySocket.connect(port, hostDomain, function () {
        proxySocket.write(bodyhead);
        socket.write("HTTP/" + req.httpVersion + " 200 Connection established\r\n\r\n");
    });

    proxySocket.on('data', function (chunk) {
        socket.write(chunk);
    });

    proxySocket.on('end', function () {
        socket.end();
    });

    proxySocket.on('error', function () {
        socket.write("HTTP/" + req.httpVersion + " 500 Connection error\r\n\r\n");
        socket.end();
    });

    socket.on('data', function (chunk) {
        proxySocket.write(chunk);
    });

    socket.on('end', function () {
        proxySocket.end();
    });

    socket.on('error', function () {
        proxySocket.end();
    });
});
proxy.on('error', function(err){
    console.log("Error occured, Porxy has beeen closed.",err)
})
proxy.on('close', function(){
    proxy.close();
    https_log.write(+'\r\n');
    http_log.write(+'\r\n');
    http_log.end(http_end);
    https_log.end(https_end);
})
