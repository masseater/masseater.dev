# Steam Workshop Mod

## Directory layout

`workshop.json` is the config describing the Steam workshop mod.

`content` is where you place the mod files to upload to Steam Workshop.
It holds at least a JSON file, and usually a PCK and a DLL.

`previews` is optional and holds more preview images, shown alongside `image.png`.
Each image must be under 1MB.
Images missing from the folder are removed from the backend, keyed by filename.
If the folder is absent, all previews stay unchanged.

`image.png` is the required image shown in the Steam Workshop. Replace it with your own image under 1MB.

## `workshop.json` Properties

This describes what gets uploaded to the workshop.

To keep a property unchanged after the initial upload, set it to `null` or remove it from the JSON. This works for most properties.

```
{
  "title": "",                -- The title of your mod.
  "description": "",          -- The description.
  "visibility": "private",    -- The visibility status of the mod.
                                  Options include: "private", "public", "unlisted", "friends_only".
  "changeNote": "",           -- A note for describing the newest changes you've made to your users.
  "tags": [],                 -- A list of tags to search for your mod by.
                                 Note: the tag "Tools & APIs" is reserved for mods that function as tools or APIs.
  "dependencies": []          -- A list of mods that your mod depends on.
                                 These should be mod IDs (can be found in the workshop URL).
  "contentDescriptors": []    -- A list of mature content descriptors that apply to your mod.
                                 Options include: "nudity", "frequent_violence", "adult_only",
                                 "gratuitous_nudity", "general_mature"


                              -- The below two seem to have weird behavior but I'm including them
                                 in case Steam fixes it. Prefer updating them on the web instead.
                                 Set to `null` or remove them to say that you support all versions.
  "minBranch": "public-beta"  -- Minimum branch supported by this mod.
  "maxBranch": "public"       -- Maximum branch supported by this mod.
}
```
