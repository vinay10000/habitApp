package com.habit.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject

class HabitWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      appWidgetManager.updateAppWidget(appWidgetId, buildViews(context))
    }
  }

  private fun buildViews(context: Context): RemoteViews {
    val snapshot = readSnapshot(context)
    val views = RemoteViews(context.packageName, context.resources.getIdentifier("habit_widget", "layout", context.packageName))
    val done = snapshot?.optInt("done") ?: 0
    val total = snapshot?.optInt("total") ?: 0
    val remaining = snapshot?.optInt("remaining") ?: 0
    val progress = snapshot?.optInt("progress") ?: 0
    val bestStreak = snapshot?.optInt("bestStreak") ?: 0
    val nextHabit = snapshot?.optJSONObject("nextHabit")?.optString("title") ?: "Open Habit"

    views.setTextViewText(context.resources.getIdentifier("habit_widget_title", "id", context.packageName), "Habit")
    views.setTextViewText(context.resources.getIdentifier("habit_widget_progress", "id", context.packageName), "$done/$total")
    views.setTextViewText(context.resources.getIdentifier("habit_widget_remaining", "id", context.packageName), if (remaining == 0) "All done today" else "$remaining left")
    views.setTextViewText(context.resources.getIdentifier("habit_widget_next", "id", context.packageName), nextHabit)
    views.setTextViewText(context.resources.getIdentifier("habit_widget_streak", "id", context.packageName), "Best streak ${bestStreak}d")
    views.setProgressBar(context.resources.getIdentifier("habit_widget_bar", "id", context.packageName), 100, progress, false)
    views.setOnClickPendingIntent(context.resources.getIdentifier("habit_widget_root", "id", context.packageName), openAppIntent(context))

    return views
  }

  private fun readSnapshot(context: Context): JSONObject? {
    val prefs = context.getSharedPreferences("habit_widget", Context.MODE_PRIVATE)
    val raw = prefs.getString("snapshot", null) ?: return null
    return runCatching { JSONObject(raw) }.getOrNull()
  }

  private fun openAppIntent(context: Context): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("habit://"))
    intent.setPackage(context.packageName)
    return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
  }
}
