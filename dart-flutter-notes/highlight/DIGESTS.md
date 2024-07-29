## Subresource Integrity

If you are loading Highlight.js via CDN you may wish to use [Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) to guarantee that you are using a legimitate build of the library.

To do this you simply need to add the `integrity` attribute for each JavaScript file you download via CDN. These digests are used by the browser to confirm the files downloaded have not been modified.

```html
<script
  src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/highlight.min.js"
  integrity="sha384-pGqTJHE/m20W4oDrfxTVzOutpMhjK3uP/0lReY0Jq/KInpuJSXUnk4WAYbciCLqT"></script>
<!-- including any other grammars you might need to load -->
<script
  src="//cdnjs.cloudflare.com/ajax/libs/highlight.js/11.10.0/languages/go.min.js"
  integrity="sha384-Mtb4EH3R9NMDME1sPQALOYR8KGqwrXAtmc6XGxDd0XaXB23irPKsuET0JjZt5utI"></script>
```

The full list of digests for every file can be found below.

### Digests

```
sha384-XkaMmz1IWxxotnRaq8UyqY+r1C0SADoKTIT/8J84nio8ZUVtw9Xw2K+fBBvQ8ziT /es/languages/dart.js
sha384-XQur/dNXGWVSWOuMk+TsDoXfe5GzflLu972jJ72dqRV4N65jOT+h4GGpXQDstHWC /es/languages/dart.min.js
sha384-dMNLrPkwjJLQU3QnOACuNxKwF5uJKlgc1jxuGPSZgOTAhFFsakEk5maskn1jbxjY /languages/dart.js
sha384-xV+yQq6yNCJpHU1bXc40ygKBQS6BF2u/5RgLa0A64Rn/ue1fW52gr1gF8rko0wkG /languages/dart.min.js
sha384-mqoHXerMoJM09UfYdVidtP6TZ3yMUsvoCrMcb1HI+Qbznfa6IhVPOCe5esXkxMEu /highlight.js
sha384-Sm6P0NU3o69UVWdZOIpP8hr3guRUI/2CBqytHS2rRFd0nEodDCbS8E8u75LYEkCY /highlight.min.js
```

