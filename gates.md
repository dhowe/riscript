#### Search and return only certain fields

Search by regular expression (use the slash or quote marks as a delimiter).
@{"name": {$regex: /^M.*/}}

Case insensitive:
@{"name": {$regex: /^jan.*/, $options: "i"}}

Find by elements in array
This matches documents that contain all of these array elements:
@{"skills": {$all: }}

Match on any element in the array:
@{"skills": "negotiation"}
