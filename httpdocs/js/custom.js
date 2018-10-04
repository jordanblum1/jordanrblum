/*
Theme Name: Worthy - Free Powerful Theme by HtmlCoder
Author:HtmlCoder
Author URI:http://www.htmlcoder.me
Version:1.0.0
Created:November 2014
License: Creative Commons Attribution 3.0 License (https://creativecommons.org/licenses/by/3.0/)
File Description: Place here your custom CSS styles
*/

/*text formatting*/
span.caps{
	font-weight:bolder;
	color: inherit;
	font-size:larger;
}

span.dev{
	font-weight:bolder;
	color: inherit;
}
p span{
	color: #339BEB;
	font-weight: 700;
}

/*intro buttons*/
ul.intro-social-buttons {
	text-align: center;
}

ul.intro-social-buttons > li {
    text-align: center;
    margin-bottom: 20px;
    padding: 10px;
}

ul.intro-social-buttons > li:last-child {
	text-align: center;
    margin-bottom: 0;
}

/*Work timeline*/
.timeline {
    position: relative;
    padding: 0;
    list-style: none;
}

.timeline:before {
    content: "";
    position: absolute;
    top: 0;
    bottom: 0;
    left: 40px;
    width: 2px;
    margin-left: -1.5px;
    background-color: #f1f1f1;
}

.timeline>li {
    position: relative;
    margin-bottom: 3%;
    min-height: 50px;
}

.timeline>li:before,
.timeline>li:after {
    content: " ";
    display: table;
}

.timeline>li:after {
    clear: both;
}

.timeline>li .timeline-panel {
    float: right;
    position: relative;
    width: 100%;
    padding: 0px 20px 0px 100px;
    text-align: left;
}

.timeline>li .timeline-panel:before {
    right: auto;
    left: -15px;
    border-right-width: 15px;
    border-left-width: 0;
}

.timeline>li .timeline-panel:after {
    right: auto;
    left: -14px;
    border-right-width: 14px;
    border-left-width: 0;
}

.timeline>li .timeline-image {
    z-index: 100;
    position: absolute;
    left: 0;
    width: 80px;
    height: 80px;
    margin-left: 0;
    border: 7px solid #f1f1f1;
    border-radius: 100px;
    text-align: center;
    color: #fff;
    background-color: #ffffff;
}

.timeline>li .timeline-image h4 {
    margin-top: 12px;
    font-size: 10px;
    line-height: 14px;
}

.timeline>li.timeline-inverted>.timeline-panel {
    float: right;
    padding: 0 20px 0 100px;
    text-align: left;
}

.timeline>li.timeline-inverted>.timeline-panel:before {
    right: auto;
    left: -15px;
    border-right-width: 15px;
    border-left-width: 0;
}

.timeline>li.timeline-inverted>.timeline-panel:after {
    right: auto;
    left: -14px;
    border-right-width: 14px;
    border-left-width: 0;
}

.timeline>li:last-child {
    margin-bottom: 0;
}

.timeline .timeline-heading h4 {
    margin-top: 0;
    color: inherit;
}

.timeline .timeline-heading h4.subheading {
    text-transform: none;
}

.timeline .timeline-body>p,
.timeline .timeline-body>ul {
    margin-bottom: 0;
}

@media(min-width:768px) {
    .timeline:before {
        left: 50%;
    }

    .timeline>li {
        min-height: 100px;
    }

    .timeline>li .timeline-panel {
        float: left;
        width: 41%;
        padding: 0px 20px 20px 30px;
        text-align: right;
    }

    .timeline>li .timeline-image {
        left: 50%;
        width: 100px;
        height: 100px;
        margin-left: -50px;
    }

    .timeline>li.resume{
	    text-align:center;
	    top: 100px;
    }

    .timeline>li .timeline-image h4 {
        margin-top: 16px;
        font-size: 13px;
        line-height: 18px;
    }

    .timeline>li.timeline-inverted>.timeline-panel {
        float: right;
        padding: 0 30px 20px 20px;
        text-align: left;
    }
}

@media(min-width:992px) {
    .timeline>li {
        min-height: 150px;
    }

    .timeline>li .timeline-panel {
        padding: 0 20px 20px;
    }

    .timeline>li .timeline-image {
        width: 150px;
        height: 150px;
        margin-left: -75px;
    }

	.timeline>li.resume{
	    text-align:center;
	    top: 120px;
    }

    .timeline>li .timeline-image h4 {
        margin-top: 30px;
        font-size: 18px;
        line-height: 26px;
    }

    .timeline>li.timeline-inverted>.timeline-panel {
        padding: 0 20px 20px;
    }
}

@media(min-width:1200px) {
    .timeline>li {
        min-height: 170px;
    }

    .timeline>li .timeline-panel {
    }

    .timeline>li .timeline-image {
        width: 170px;
        height: 170px;
        margin-left: -85px;
    }

    .timeline>li.resume{
	    text-align:center;
	    top: 120px;
    }

    .timeline>li .timeline-image h4 {
        margin-top: 40px;
    }

    .timeline>li.timeline-inverted>.timeline-panel {
    }
}

.timeline-heading>h4 span{
	color: #339BEB;
	font-weight: 700;
}

.timeline>li .btn{
	z-index: 100;
    position: relative;
    left: 0;
    margin-left: 0;
    border: 7px solid #f1f1f1;
    text-align: center;
    color: #339BEB;
    text-decoration: none;
}

.timeline>li .btn:hover{
	color: #fff;
}

.centered{
	text-align:center;
}

.proc {
	padding-top: 15px;
	padding-bottom: 15px;
	border-bottom: solid 2px transparent;
}

.proc i{
	font-size: 50px;
}

.proc:hover {
	background-color: #eee;
	border-bottom: solid 2px #2f2f2f
}

.mt {
	margin-top: 50px;
}

/* Skills */
.skill{
	text-align: center;
}

.piechart {
	margin-left: auto;
	margin-right: auto;
	width: 180px;
	border-radius: 100%;
	background-color: rgba(255, 255, 255, 0.2);
	position: relative;
}

.skill img {
	width: 45%;
	margin: auto;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	position: absolute;
	display: block;
}

/*Column expand fits for isotope items*/
.isotope-item{
	margin: 15px 15px 15px 15px;
}

.image-box{

}

.image-box img{
	max-height: 200px;
}

.row .col-md-6{
	vertical-align: middle;
}