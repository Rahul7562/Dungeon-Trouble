project(ConfigurationTests CXX)

file(GLOB_RECURSE SOURCES "*.cpp")

add_executable(ConfigurationTests ${SOURCES})

# Need exceptions enabled for Catch2
set_target_properties(ConfigurationTests PROPERTIES COMPILE_FLAGS "-fexceptions")

target_link_libraries(ConfigurationTests PRIVATE Configuration Catch2)
