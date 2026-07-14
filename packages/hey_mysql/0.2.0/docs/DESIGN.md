# Design: hey_mysql

## Native boundary

The C wrapper hides `MYSQL*`, `MYSQL_RES*`, row pointers, and Connector/C option enums behind opaque Hey capabilities. Network calls are blocking and non-thread-safe in the manifest. The public package never exposes host pointers or `HeyValue`.

## Result ownership

`store_result` allocates a package result wrapper. `fetch_row` updates its current borrowed row and lengths. Hey copies each field immediately. `free_result` releases both the Connector/C result and wrapper. `Mysql.close` closes the connection before unloading the extension.

## Parameter policy

The first release exposes safe Connector/C escaping for generated SQL plans. This keeps values separate until the adapter boundary, but it is not equivalent to prepared statements. v0.3.0 should add `MYSQL_STMT` handles, typed bind buffers, result metadata, cancellation, and statement reuse.

## TLS

The adapter exposes key/certificate/CA/cipher settings and optional server-certificate verification where Connector/C supports `MYSQL_OPT_SSL_VERIFY_SERVER_CERT`. Authentication-plugin and platform matrix receipts belong to this package, not the language.
