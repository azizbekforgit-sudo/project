$f = 'C:\Users\123\Desktop\agroverse-fixed\agroverse front\js\pages\delivery.js'
$c = Get-Content $f -Raw -Encoding UTF8

# Replace SECTIONS icons: 'emoji' -> fe('emoji',20)
$emojiPattern = "icon: '([^']*)'"
$c = [regex]::Replace($c, "icon: '([\x{1F300}-\x{1F9FF}\x{2600}-\x{27BF}\x{FE00}-\x{FE0F}\x{200D}\x{20E3}\x{E0020}-\x{E007F}]+)'", 'icon: fe(''$1'',20)')

# Replace inline emojis in HTML: >emoji< pattern
$c = $c -replace '>([\x{1F300}-\x{1F9FF}\x{2600}-\x{27BF}]+)<', '>$(fe(''$1'',24))<'

# Replace TRANSPORT_EMOJI values
$c = $c -replace "fura: '([^']*)'", "fura: fe('`$1',20)"
$c = $c -replace "refrig: '([^']*)'", "refrig: fe('`$1',20)"
$c = $c -replace "tentovan: '([^']*)'", "tentovan: fe('`$1',20)"
$c = $c -replace "samosval: '([^']*)'", "samosval: fe('`$1',20)"
$c = $c -replace "bortovoy: '([^']*)'", "bortovoy: fe('`$1',20)"

Set-Content $f $c -Encoding UTF8 -NoNewline
Write-Output "Done"
