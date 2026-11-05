export const canonicalApplication =
  'Name: HZH\nDesc: Welcome to HZH\nLink: https://clannad.top\nAvatar: https://clannad.top/favicon.png'

// Comment 64 as supplied in the incident report, including smart quotes and the final comma.
export const jsonApplication = `{
“Name”: “HZH”,
“Desc”: “Welcome to HZH”,
“Link”: “https://clannad.top”,
“Avatar”: “https://clannad.top/favicon.png”,
}`

// Waline's stored HTML shape: paragraphs, line breaks and auto-linked URL values.
export const htmlApplication = `<p>{<br>
“Name”: “HZH”,<br>
“Desc”: “Welcome to HZH”,<br>
“Link”: “<a href="https://clannad.top" target="_blank" rel="nofollow">https://clannad.top</a>”,<br>
“Avatar”: “<a href="https://clannad.top/favicon.png" target="_blank" rel="nofollow">https://clannad.top/favicon.png</a>”,<br>
}</p>`
