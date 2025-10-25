-- 删除现有的匿名用户策略（如果存在）
DROP POLICY IF EXISTS "AI roles are viewable by anonymous users" ON ai_roles;

-- 创建新的策略，允许匿名用户查看 AI 角色
CREATE POLICY "AI roles are viewable by anonymous users" ON ai_roles
    FOR SELECT TO anon USING (true);

-- 确保策略生效
GRANT SELECT ON ai_roles TO anon;