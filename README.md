# HTTPRequestSmuggling
ELI5/ Deep Dive - HTTTP Request Smuggling


## TL;DR - What is it?
Read: https://portswigger.net/web-security/request-smuggling

## Lets dive!

#### So why exactly is this dangerous from a security perspective

Most modern web application infrastructure consists of one or many load balancers/WAFs, which sit in front of actual application servers. Typically, the trust model for these is that traffic to the load balancer from the outside internet is seen as unsafe, but traffic from the load balancer to the application server or from the application server itself is safer as it has made it past the load balancer security controls.

Consider this: In the below diagram, we see some sort of WAF/Load Balancer that sits in front of several API gateways. If the infrstructure is such that the assumption is that illegitemate/unsafe traffic is prevented from hitting the API's via the WAF, then smuggling requests past the WAF enable us to send requests to API endpoints that we were not allowed to send requests from outside the security perimeter.

[application]: /images/application.png
