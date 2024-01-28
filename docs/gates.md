## RiScript Gates (with Mingo-style operators)

### Comparison
   
The following operators can be used in queries to compare values:

    @eq: Values are equal
    @ne: Values are not equal
    @gt: Value is greater than another value
    @gte: Value is greater than or equal to another value
    @lt: Value is less than another value
    @lte: Value is less than or equal to another value
    @in: Value is matched within an array

### Logical

The following operators logically combine multiple queries:

    @and: Returns documents where both queries match
    @or: Returns documents where either query matches
    @nor: Returns documents where both queries fail to match
    @not: Returns documents where the query does not match

### Existence
The following operators can be used in queries the existence of fields:

    @exists: symbols exists 
    not @exists: symbols doesn't exists 
    
### Evaluation

The following operators assist in evaluating documents:

    @text: Performs a text search
    @regex: Match symbol values with regular expressions
    @where: Uses JS expressions to match fields

### Operator Table

<table>
<thead><tr>
<th>Operator</th>
<th>Description</th>
<th>Commands</th>
</tr></thead>
<tbody>
<tr>
<td>@exists</td>
<td>does a symbol exist or not</td>
<td><code>@{ symbol: { @exists: true }</code></td>
</tr>
<tr>
<td>@gt&nbsp;</td>
<td>with value greater than&nbsp;</td>
<td><code>@{ symbol: { @gt: 3 }</code></td>
</tr>
<tr>
<td>@gte&nbsp;</td>
<td>with value greater or equal to</td>
<td><code>@{ symbol: { @gte: 3}</code></td>
</tr>
<tr>
<td>@lt&nbsp;</td>
<td>with value lesser than&nbsp;</td>
<td><code>@{ symbol: { @lt: 4}</code></td>
</tr>
<tr>
<td>@lte</td>
<td>with value lesser than or equal to</td>
<td><code>@{ symbol: { @lte: 4}</code></td>
</tr>
<tr>
<td>@regex</td>
<td>matches a regular expression pattern </td>
<td><code>@{ symbol: { @regex: /^USS\sE/ }})</code></td>
</tr>
</tbody>
</table>

-------

### Examples


The @exists operator will look for values that do or do not exist:  

```
@{ secret: { @exists: true}
@{ secret: { @exists: false}
```

The @eq and @ne operator will look for values match or do not match a value:  

```
@{ gender: { @ne: "male" } }
@{ name: { @eq: "kerri" } }
```
The @in operator will look for equal values that match anything specified in an array:  

```
@{ rank: { @in: [ "warrior", "scholar", "sage" ] } }
```

The @nin operator will look for equal values that do NOT match anything in an array:  

```
@{ rank: { @nin: [ "novice", "precept", "learner" ] } }
```

The @all operator for matching ALL the elements in an array:  

```
@{ items: { @all: [ "bread", "nut butter", "jam" ] } }
```

The @elemMatch operator for matching ANY element in an array:

```
@{ items: { @elemMatch: { "crowbar", "key", "spell", "explosive" } } }
```

The @and operator logically combines two or more queries:  

```
@{ @and: [ { age: { @gt: 12 } }, { age: { @exists: true } } ] }
```
(equivalent to)  
```
@{ { age: { @gt: 12, @exists: true } }
```

The @or operator logically combines two or more queries:  

```
@{ @or: [ { age: { @gt: 12 } }, { age: { @exists: false } } ] }
```

The @nor operator logically combines two or more queries:  

```
@{ @nor: [ { age: { @lt: 12 } }, { age: { @exists: false } } ] }
```


--------

Search by regular expression:  

```
@{ name: { @regex: /^M.*/}}
```

Regex options: case insensitive:  

```
@{ name: { @regex: /^jan.*/, @options: "i"}}
```

Find by elements in array:
This matches documents that contain all of these array elements:  

```
@{ protection: { @all: "helmet", "armor" }}
```
(equivalent to)
```
{ @and: [ { protection: "helmet" }, { protection: "armor" } ] }
```

Match on any element in the array:  

```
@{ skills: "negotiation"}
```

Match on inequality:  

```
@{ strength: { @gt: 18 } }
```  
