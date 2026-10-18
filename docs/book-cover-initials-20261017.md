# Default catalog covers

Public and signed-in catalogs, details, carts, and other shared book thumbnails use the previous library’s blue plate when a title has no official artwork. That plate is a blue field, a yellow stripe on the left, the title in yellow, and the author in white. A blank author line reads “Author not recorded.”

Saved paths named `generated-v4-….png` are treated as this plate. Those picture files are not stored with the project, so the page draws the plate instead of requesting a missing file. A real cover image still loads when its file exists. If that file fails to load, the plate is shown.
