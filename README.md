<a href="https://github.com/dhowe/riscript/actions"><img src="https://github.com/dhowe/riscript/actions/workflows/node.js.yml/badge.svg" alt="ci tests"></a>  <a href="https://www.npmjs.com/package/riscript"> <img src="https://img.shields.io/npm/v/riscript.svg" alt="npm version"></a> <a href="https://www.gnu.org/licenses/gpl-3.0.en.html"><img src="https://img.shields.io/badge/license-GPL-orange.svg" alt="license"></a> ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/dhowe/riscript?label=code&color=yellow)

## RiScript: a scripting language for writers

RiScript is a minor language designed for writers working in computational media. It runs in a variety of environments, including the browser, Node, Observable, P5.js, Android and others. RiScript primitives (choices, symbols, gates, transforms, etc) can be used as part of any RiScript [grammar](https://rednoise.org/rita/reference/RiScript/grammar/) or executed directly using [evaluate()](https://rednoise.org/rita/reference/RiScript/grammar/). RiScript is free/libre/open-source and integrates with [RiTa](https://rednoise.org/rita).

For more documentation and examples see this interactive [notebook](https://observablehq.com/@dhowe/riscript) on observable. 

### Installation

* For [esm](#an-esm-browser-sketch): ```import { RiScript } from "https://esm.sh/riscript";```
* For [browsers](#a-simple-browser-sketch): ```<script src="https://unpkg.com/riscript"></script>```
* For [node](#with-nodejs-and-npm): `$ npm install riscript`  
 ```let { RiScript }  = require('riscript');```
* For [developers](#developing)


### Example

```javascript

import { RiScript } from "https://esm.sh/riscript";

let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin]]."
  + " $name finds $place cold and wet in winter.";

let result = RiScript.evaluate(script);

console.log(result);
```

<br>

## Developing
To install/build the library and run tests:
```sh

$ git clone https://github.com/dhowe/riscript.git
$ cd riscript 
$ npm install
$ npm run build 
$ npm test

```
If all goes well, you should see a list of successful tests and find the library built in 'dist'

<br>

Please make contributions via [fork-and-pull](https://reflectoring.io/github-fork-and-pull/) - thanks!

<br>

## About

* Author:   [Daniel C. Howe](http://rednoise.org/daniel)
* Tutorial: [https://observablehq.com/@dhowe/riscript](https://observablehq.com/@dhowe/riscript)
* Github Repo:       [https://github.com/dhowe/riscript](https://github.com/dhowe/riscript)
* Issues:       [https://github.com/dhowe/riscript/issues](https://github.com/dhowe/riscript/issues)
* Reference:    [https://rednoise.org/rita/reference](http://rednoise.org/rita/reference)
* RiTa Web:          [https://rednoise.org/rita](http://rednoise.org/rita)

&nbsp;

## Quick Start 

#### A simple browser sketch
 
Create a new file on your desktop called 'test.html' with the following lines, save and drag it into a browser:

```html
<html>
<script src="https://unpkg.com/riscript"></script>
<script>
  window.onload = function () {
    let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]]."
      + " $name finds $place cold and wet in winter.";
    let html = RiScript.evaluate(script);
    document.getElementById("content").innerHTML = html;
  };
</script>
<div id="content" width=200 height=200></div>
</html>
```

#### An ESM browser sketch
 
Create a new file on your desktop called 'test.html' with the following lines, save and drag it into a browser:

```html
<html>
<body>
  <div id="content" width=200 height=200></div>
  <script type="module">

    import { RiScript } from "https://esm.sh/riscript";

    let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]]."
      + " $name finds $place cold and wet in winter.";
    let html = RiScript.evaluate(script);

    document.getElementById("content").innerHTML = html; 
  </script>
</body>
<html>
```

#### With [p5.js](http://p5js.org/)
 
Create a new file on your desktop called 'test.html' with the following lines,, save and drag it into a browser:

```html
<html>
  <script src="https://unpkg.com/p5"></script>
  <script src="https://unpkg.com/riscript"></script>
  <script>
  function setup() {

    createCanvas(600,200);
    background(245);
    textAlign(CENTER)
    textSize(18);

    let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]]."
      + " $name finds $place cold and wet in winter.";
    let result = RiScript.evaluate(script);
    text(result, 300, 100);

    createButton("refresh").mousePressed(() => location.reload());
  }
  </script>
</html>
```

#### With [node.js](http://nodejs.org/) and [npm](https://www.npmjs.com/)
 
To install: `$ npm install riscript`

```javascript
let { RiScript }  = require('riscript');

let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]]."
  + " $name finds $place cold and wet in winter.";

let result = RiScript.evaluate(script);

console.log(result);
```

&nbsp;

## Contributors

### Code Contributors

This project exists only because of the people who contribute. Thank you!
<a href="https://github.com/dhowe/riscript/graphs/contributors"><img src="https://opencollective.com/RiTa/contributors.svg?width=890&button=false" /></a>

### Financial Contributors
<a href="https://opencollective.com/rita/donate" target="_blank">
  <img src="https://opencollective.com/rita/contribute/button@2x.png?color=blue" width=300 />
</a>

