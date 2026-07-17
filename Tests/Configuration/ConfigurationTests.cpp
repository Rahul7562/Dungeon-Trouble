#include <catch_amalgamated.hpp>
#include "Configuration/ConfigurationManager.h"
#include "Configuration/ConfigVar.h"
#include "Configuration/Providers.h"
#include "Configuration/Formatters.h"
#include "Configuration/ResultHelpers.h"

using namespace Configuration;

enum class GraphicsQuality { Low = 0, Medium = 1, High = 2 };

TEST_CASE("ConfigVar Types and Defaults", "[Configuration]") {
    ConfigurationManager mgr;

    ConfigVar<Core::i32> intVar(mgr, "test.int", 42);
    ConfigVar<Core::f32> floatVar(mgr, "test.float", 3.14f);
    ConfigVar<bool> boolVar(mgr, "test.bool", true);
    ConfigVar<std::string> strVar(mgr, "test.str", "default");

    REQUIRE(intVar.Get() == 42);
    REQUIRE(floatVar.Get() == 3.14f);
    REQUIRE(boolVar.Get() == true);
    REQUIRE(strVar.Get() == "default");
}

TEST_CASE("Providers and Overrides", "[Configuration]") {
    ConfigurationManager mgr;

    auto fileProv = std::make_shared<MemoryProvider>("FileSim", 10);
    auto envProv = std::make_shared<MemoryProvider>("EnvSim", 20);
    auto cliProv = std::make_shared<MemoryProvider>("CliSim", 30);

    mgr.AddProvider(fileProv);
    mgr.AddProvider(envProv);
    mgr.AddProvider(cliProv);

    ConfigVar<std::string> multiVar(mgr, "override.test", "default");

    // Test base
    REQUIRE(multiVar.Get() == "default");

    // Test file level
    fileProv->SetValue("override.test", std::string("file_value"));
    mgr.NotifyVars();
    REQUIRE(multiVar.Get() == "file_value");

    // Test env level overriding file
    envProv->SetValue("override.test", std::string("env_value"));
    mgr.NotifyVars();
    REQUIRE(multiVar.Get() == "env_value");

    // Test cli level overriding env
    cliProv->SetValue("override.test", std::string("cli_value"));
    mgr.NotifyVars();
    REQUIRE(multiVar.Get() == "cli_value");
}

TEST_CASE("Formatters", "[Configuration]") {
    IniFormatter ini;

    std::string iniData = "[Graphics]\nResolutionX=1920\nFullscreen=true\n";
    auto iniResult = ini.Parse(iniData);
    REQUIRE(iniResult.IsOk());

    auto& map = iniResult.Get();
    REQUIRE(std::get<Core::i32>(map["Graphics.ResolutionX"]) == 1920);
    REQUIRE(std::get<bool>(map["Graphics.Fullscreen"]) == true);

    JsonFormatter json;
    std::string jsonData = "{\n\"NetworkPort\": 8080,\n\"Host\": \"localhost\"\n}";
    auto jsonResult = json.Parse(jsonData);
    REQUIRE(jsonResult.IsOk());

    auto& jmap = jsonResult.Get();
    REQUIRE(std::get<Core::i32>(jmap["NetworkPort"]) == 8080);
    REQUIRE(std::get<std::string>(jmap["Host"]) == "localhost");
}

TEST_CASE("ConfigVar Validation and Enums", "[Configuration]") {
    ConfigurationManager mgr;
    auto prov = std::make_shared<MemoryProvider>("ValSim", 100);
    mgr.AddProvider(prov);

    ConfigVar<Core::i32> boundedVar(mgr, "val.bound", 10, [](const Core::i32& v) { return v >= 0 && v <= 100; });

    REQUIRE(boundedVar.Get() == 10);

    prov->SetValue("val.bound", 50);
    mgr.NotifyVars();
    REQUIRE(boundedVar.Get() == 50); // Valid, updates

    prov->SetValue("val.bound", 200);
    mgr.NotifyVars();
    REQUIRE(boundedVar.Get() == 50); // Invalid, keeps OLD valid value

    ConfigVar<Core::i32> enumVar(mgr, "graphics.quality", 1);
    REQUIRE(enumVar.Get() == 1);

    prov->SetValue("graphics.quality", 2);
    mgr.NotifyVars();
    REQUIRE(enumVar.Get() == 2);
}

TEST_CASE("Profiles", "[Configuration]") {
    ConfigurationManager mgr;

    auto devProv = std::make_shared<MemoryProvider>("DevSim", 100, std::vector<std::string>{"Development"});
    auto releaseProv = std::make_shared<MemoryProvider>("ReleaseSim", 100, std::vector<std::string>{"Release"});

    devProv->SetValue("server.url", std::string("localhost"));
    releaseProv->SetValue("server.url", std::string("production.com"));

    mgr.AddProvider(devProv);
    mgr.AddProvider(releaseProv);

    ConfigVar<std::string> urlVar(mgr, "server.url", "default");

    mgr.SetActiveProfile("Development");
    REQUIRE(urlVar.Get() == "localhost");

    mgr.SetActiveProfile("Release");
    REQUIRE(urlVar.Get() == "production.com");
}
