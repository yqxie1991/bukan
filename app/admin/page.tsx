import { redirect } from 'next/navigation';

/**
 * /admin 索引路由
 *
 * 后台的实际页面在 /admin/settings，而 proxy.ts 只负责鉴权、不做路径归一化，
 * 因此直接访问 /admin（手输、书签，或登录后的回跳目标）会命中 404。
 * 这里统一重定向到实际页面。
 *
 * 用 307（临时）而非 308：将来若把 /admin 做成真正的后台首页，无需担心
 * 浏览器把旧的永久重定向缓存下来。
 */
export default function AdminIndexPage() {
  redirect('/admin/settings');
}
