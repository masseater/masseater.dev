# aredoko-server

This workspace is the aredoko server, which runs on the same PC as Unity. It indexes the user's assets, finds the assets that match a search, and hands the results to the Unity editor extension.

Do not run inference inside Unity.
Embed 3D models as images rendered from several directions. Do not generate and embed captions.
Never send assets or search words off the PC. The only outside requests are to the public JSON of BOOTH product pages. Do not read the BOOTH login state, cookies or purchase history.
Read the Unity Asset Store and BOOTH Library Manager data, but never change it. Copy a dropped package into `library` in the data folder before indexing it.
Keep development and tests runnable on Linux in the cloud. Do not add work that can only be checked on Windows.
Write the editor extension using only C# 9 and the APIs of Unity 2022.3.22f1, which the VRChat SDK uses.
