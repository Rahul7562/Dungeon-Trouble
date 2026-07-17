add_library(Catch2 catch_amalgamated.cpp)
target_include_directories(Catch2 PUBLIC .)
# Catch2 needs exceptions disabled appropriately if required, or we just compile it separately.
# Since Catch2 needs exceptions internally for some features, we override the flag just for it.
set_target_properties(Catch2 PROPERTIES COMPILE_FLAGS "-fexceptions")
