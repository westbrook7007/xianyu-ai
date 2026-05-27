"use client";

import { useEffect, useState } from "react";
import { getUserId, loadPreferenceTemplate } from "@/lib/user";
import type { TaskSchedule, PriceAlert, UserPreference } from "@/lib/types";
import { Bell, Clock, Settings, Trash2 } from "lucide-react";

export default function ProfilePage() {
  const [tasks, setTasks] = useState<TaskSchedule[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [prefTemplate, setPrefTemplate] = useState<Partial<UserPreference> | null>(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newTime, setNewTime] = useState("10:00");
  const userId = typeof window !== "undefined" ? getUserId() : "";

  useEffect(() => {
    if (!userId) return;
    setPrefTemplate(loadPreferenceTemplate());
    loadTasks();
    loadAlerts();
    requestNotificationPermission();
  }, [userId]);

  async function loadTasks() {
    const res = await fetch(`/api/tasks?userId=${userId}`);
    const data = await res.json();
    setTasks(data.tasks || []);
  }

  async function loadAlerts() {
    const res = await fetch(`/api/alerts?userId=${userId}`);
    const data = await res.json();
    setAlerts(data.alerts || []);
  }

  function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }

  async function addTask() {
    if (!newKeyword.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        keyword: newKeyword.trim(),
        task_time: newTime,
        task_status: 1,
        remind_threshold: 0.8,
      }),
    });
    setNewKeyword("");
    loadTasks();
  }

  async function toggleTask(id: number, status: number) {
    await fetch("/api/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, task_status: status === 1 ? 0 : 1 }),
    });
    loadTasks();
  }

  async function deleteTask(id: number) {
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    loadTasks();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">个人中心</h1>
        <p className="text-sm text-gray-500">用户ID: {userId}</p>
      </div>

      {/* 定时任务 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-brand-500" />
          <h2 className="font-semibold">定时监控任务</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          <input
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="监控商品关键词"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="time"
            value={newTime}
            onChange={(e) => setNewTime(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <button onClick={addTask} className="rounded-lg bg-brand-500 px-4 py-2 text-sm text-white hover:bg-brand-600">
            添加监控
          </button>
        </div>
        <div className="space-y-2">
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
              <div>
                <span className="font-medium">{t.keyword}</span>
                <span className="ml-2 text-sm text-gray-400">每日 {t.task_time}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleTask(t.id!, t.task_status)}
                  className={`rounded-full px-3 py-1 text-xs ${t.task_status === 1 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                >
                  {t.task_status === 1 ? "已开启" : "已关闭"}
                </button>
                <button onClick={() => deleteTask(t.id!)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {tasks.length === 0 && <p className="text-sm text-gray-400">暂无监控任务</p>}
        </div>
      </section>

      {/* 低价提醒 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-5 w-5 text-brand-500" />
          <h2 className="font-semibold">低价提醒记录</h2>
        </div>
        <div className="space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className={`rounded-lg border p-3 ${a.alert_type === "historic_low" ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
              <div className="flex items-center justify-between">
                <span className={`rounded px-2 py-0.5 text-xs font-medium ${a.alert_type === "historic_low" ? "bg-red-500 text-white" : "bg-green-500 text-white"}`}>
                  {a.alert_type === "historic_low" ? "史低入手" : "优质好价"}
                </span>
                <span className="font-bold text-brand-600">¥{a.price}</span>
              </div>
              <p className="mt-1 text-sm">{a.title}</p>
              <p className="text-xs text-gray-400">{a.keyword} · AI分 {a.ai_score}</p>
            </div>
          ))}
          {alerts.length === 0 && <p className="text-sm text-gray-400">暂无提醒，开启定时监控后自动推送</p>}
        </div>
      </section>

      {/* 偏好模板 */}
      <section className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Settings className="h-5 w-5 text-brand-500" />
          <h2 className="font-semibold">默认偏好模板</h2>
        </div>
        {prefTemplate ? (
          <pre className="overflow-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-600">
            {JSON.stringify(prefTemplate, null, 2)}
          </pre>
        ) : (
          <p className="text-sm text-gray-400">完成一次偏好问卷后自动保存</p>
        )}
      </section>
    </div>
  );
}
