## RiScript Gates (with Mingo-style operators)

### Comparison

The following operators can be used in queries to compare values:

    $eq: Values are equal
    $ne: Values are not equal
    $gt: Value is greater than another value
    $gte: Value is greater than or equal to another value
    $lt: Value is less than another value
    $lte: Value is less than or equal to another value
    $in: Value is matched within an array

### Logical

The following operators logically combine multiple queries:

    $and: Returns documents where both queries match
    $or: Returns documents where either query matches
    $nor: Returns documents where both queries fail to match
    $not: Returns documents where the query does not match

### Evaluation

The following operators assist in evaluating documents:

    $text: Performs a text search
    $regex: Match symbol values with regular expressions
    $where: Uses JS expressions to match fields

### Operators

<table>
<thead><tr>
<th>Operator</th>
<th>Description</th>
<th>Commands</th>
</tr></thead>
<tbody>
<tr>
<td>$gt&nbsp;</td>
<td>greater than&nbsp;</td>
<td><code>@{ $symbol: { $gt: 3 }</code></td>
</tr>
<tr>
<td>$gte&nbsp;</td>
<td>greater than equals</td>
<td><code>@{ $symbol: { $gte: 3}</code></td>
</tr>
<tr>
<td>$lt&nbsp;</td>
<td>lesser than&nbsp;</td>
<td><code>@{ $symbol: { $lt: 4}</code></td>
</tr>
<tr>
<td>$lte</td>
<td>lesser than equals</td>
<td><code>@{ $symbol: { $lte: 4}</code></td>
</tr>
<tr>
<td>$exists</td>
<td>does an attribute exist or not</td>
<td><code>@{ $symbol: { $exists: 'T'}</code></td>
</tr>
<tr>
<td>$regex</td>
<td>Matching pattern in pearl-style</td>
<td><code>@{ $name:{ $regex: '^USS\\sE'}})</code></td>
</tr>
</tbody>
</table>


### Examples

**Search by regular expression (use the slash or quote marks as a delimiter).
**@{$name: {$regex: /^M.*/}}

**Case insensitive:
**@{$name: {$regex: /^jan.*/, $options: "i"}}

**Find by elements in array
**This matches documents that contain all of these array elements:
@{$skills: {$all: }}

**Match on any element in the array:
**@{$skills: "negotiation"}

**Match on inequality
@{ $strength: { $gt: 18 } }
