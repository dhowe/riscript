**Search and return only certain fields**

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
<td><code>@{class:{$gt:'T'}</code></td>
</tr>
<tr>
<td>$gte&nbsp;</td>
<td>greater than equals</td>
<td><code>@{class:{$gt:'T'}</code></td>
</tr>
<tr>
<td>$lt&nbsp;</td>
<td>lesser than&nbsp;</td>
<td><code>@{class:{$lt:'T'}</code></td>
</tr>
<tr>
<td>$lte</td>
<td>lesser than equals</td>
<td><code>@{class:{$lte:'T'}</code></td>
</tr>
<tr>
<td>$exists</td>
<td>does an attribute exist or not</td>
<td><code>@{class:{$gt:'T'}</code></td>
</tr>
<tr>
<td>$regex</td>
<td>Matching pattern in pearl-style</td>
<td><code>@{name:{$regex:'^USS\\sE'}})</code></td>
</tr>
<tr>
<td>$type&nbsp;</td>
<td>search by type of an element</td>
<td><code>@{name : {$type:4}})</code></td>
</tr>
</tbody>
</table>
