package com.habit.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class HabitWidgetModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "HabitWidget"

  @ReactMethod
  fun setSnapshot(snapshot: String) {
    reactContext.getSharedPreferences("habit_widget", Context.MODE_PRIVATE)
      .edit()
      .putString("snapshot", snapshot)
      .apply()

    val intent = Intent(reactContext, HabitWidgetProvider::class.java).apply {
      action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
      val manager = AppWidgetManager.getInstance(reactContext)
      val component = ComponentName(reactContext, HabitWidgetProvider::class.java)
      putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, manager.getAppWidgetIds(component))
    }
    reactContext.sendBroadcast(intent)
  }
}
