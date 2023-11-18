<a href="https://github.com/dhowe/riscript/actions"><img src="https://github.com/dhowe/riscript/actions/workflows/node.js.yml/badge.svg" alt="ci tests"></a> <a href="https://www.gnu.org/licenses/gpl-3.0.en.html"><img src="https://img.shields.io/badge/license-GPL-orange.svg" alt="license"></a> <a href="https://www.npmjs.com/package/riscript"><img src="https://img.shields.io/npm/v/riscript.svg" alt="npm version"></a>

## RiScript: a scripting language for writers

RiScript is a grammar expansion micro-language designed for writers working in computational media. It runs in a variety of environments, including the Browser, Node, Observable, P5.js, Android and others. RiScript primitives can be used as part of any [RiTa grammar](https://rednoise.org/rita/reference/RiTa/grammar/) or executed directly using RiScript.evaluate()). For more info, see [this interactive notebook](https://observablehq.com/@dhowe/riscript).

### Installation

* For node: `npm install riscript`
* For [browsers](#a-simple-sketch): ```<script src="https://unpkg.com/riscript"></script>```
* For [developers](#developing)


### Example (node)

```javascript
let { RiScript }  = require('riscript');

let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]].\
              $name finds $place cold and wet in winter.";

let result = RiScript.evaluate(script);

console.log(result);
```

<br><hr><br>

## Developing
To install/build the library and run tests (with npm/mocha and node v14.x):
```sh

$ git clone https://github.com/dhowe/riscript.git
$ cd riscript 
$ npm install
$ npm run build 
$ npm run test

```
If all goes well, you should see a list of successful tests and find the library built in 'dist'

<br>

Please make contributions via [fork-and-pull](https://reflectoring.io/github-fork-and-pull/) - thanks!


&nbsp;

## Quick Start 

#### A simple sketch
 
Create a new file on your desktop called 'test.html' with the following lines, save and drag it into a browser:

```html
<html>
<script src="https://unpkg.com/riscript"></script>
<script>
  window.onload = function () {
    let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]].\
                  $name finds $place cold and wet in winter.";
    let html = RiScript.evaluate(script);
    document.getElementById("content").innerHTML = html;
  };
</script>
<div id="content" width=200 height=200></div>
</html>
```

#### With [p5.js](http://p5js.org/)
 
Create a new file on your desktop called 'test.html', add the following lines, save and drag it into a browser:

```html
<html>
  <script src="https://unpkg.com/p5"></script>
  <script src="https://unpkg.com/riscript"></script>
  <script>
  function setup() {

    createCanvas(200,200);
    background(50);
    textSize(20);
    noStroke();

    let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]].\
                  $name finds $place cold and wet in winter.";
    let html = RiScript.evaluate(script);

    //let words = RiTa.tokenize("The elephant took a bite!")
    for (let i=0; i < words.length; i++) {
        text(words[i], 50, 50 + i*20);
    }
  }
  </script>
</html>
```

#### With [node.js](http://nodejs.org/) and [npm](https://www.npmjs.com/)
 
To install: `$ npm install riscript`

```javascript
let { RiScript }  = require('riscript');

let script = "[#name=[Jane | Bill]] was from [#place=[New York | Berlin | Shanghai]].\
              $name finds $place cold and wet in winter.";

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

