!macro NSIS_HOOK_PREUNINSTALL
  ${If} $UpdateMode <> 1
    Delete "$INSTDIR\*.dll"
    Delete "$INSTDIR\*.dll.part"
  ${EndIf}
!macroend
