/* global __dirname */
const fs = require("fs");
const path = require("path");
const { AndroidConfig, withAndroidManifest, withDangerousMod, withMainApplication, withStringsXml } = require("expo/config-plugins");

const widgetSource = path.join(__dirname, "..", "widget", "android");

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const destinationPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
    } else {
      fs.copyFileSync(sourcePath, destinationPath);
    }
  }
}

function addWidgetReceiver(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application.receiver = application.receiver ?? [];

  const receiverName = "com.habit.widget.HabitWidgetProvider";
  const exists = application.receiver.some((receiver) => receiver.$?.["android:name"] === receiverName);

  if (!exists) {
    application.receiver.push({
      $: {
        "android:name": receiverName,
        "android:exported": "true",
        "android:label": "Habit"
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.appwidget.action.APPWIDGET_UPDATE" } }]
        }
      ],
      "meta-data": [
        {
          $: {
            "android:name": "android.appwidget.provider",
            "android:resource": "@xml/habit_widget_info"
          }
        }
      ]
    });
  }

  return manifest;
}

function registerWidgetPackage(contents) {
  if (contents.includes("com.habit.widget.HabitWidgetPackage")) {
    return contents;
  }

  const withImport = contents.replace(/import com.facebook.react.PackageList\n/, "import com.facebook.react.PackageList\nimport com.habit.widget.HabitWidgetPackage\n");
  return withImport.replace(/PackageList\(this\)\.packages\.apply \{/, "PackageList(this).packages.apply {\n            add(HabitWidgetPackage())");
}

module.exports = function withAndroidHabitWidget(config) {
  config = withDangerousMod(config, [
    "android",
    async (modConfig) => {
      const projectRoot = modConfig.modRequest.projectRoot;
      copyDirectory(path.join(widgetSource, "java"), path.join(projectRoot, "android", "app", "src", "main", "java"));
      copyDirectory(path.join(widgetSource, "res"), path.join(projectRoot, "android", "app", "src", "main", "res"));
      return modConfig;
    }
  ]);

  config = withMainApplication(config, (modConfig) => {
    modConfig.modResults.contents = registerWidgetPackage(modConfig.modResults.contents);
    return modConfig;
  });

  config = withStringsXml(config, (modConfig) => {
    modConfig.modResults = AndroidConfig.Strings.setStringItem(
      [{ $: { name: "habit_widget_description" }, _: "Today’s habit progress" }],
      modConfig.modResults
    );
    return modConfig;
  });

  config = withAndroidManifest(config, (modConfig) => {
    modConfig.modResults = addWidgetReceiver(modConfig.modResults);
    return modConfig;
  });

  return config;
};
