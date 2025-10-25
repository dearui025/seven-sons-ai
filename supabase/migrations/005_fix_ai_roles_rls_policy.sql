-- 修复 ai_roles 表的 RLS 策略，允许服务角色插入数据

-- 为 ai_roles 表添加 INSERT 策略，允许服务角色插入数据
CREATE POLICY "Service role can insert AI roles" ON ai_roles
    FOR INSERT TO service_role WITH CHECK (true);

-- 为 ai_roles 表添加 UPDATE 策略，允许服务角色更新数据
CREATE POLICY "Service role can update AI roles" ON ai_roles
    FOR UPDATE TO service_role USING (true);

-- 为 ai_roles 表添加 DELETE 策略，允许服务角色删除数据（如果需要）
CREATE POLICY "Service role can delete AI roles" ON ai_roles
    FOR DELETE TO service_role USING (true);

-- 确保认证用户可以查看所有 AI 角色（这个策略已经存在，但确保它正确）
DROP POLICY IF EXISTS "AI roles are viewable by authenticated users" ON ai_roles;
CREATE POLICY "AI roles are viewable by authenticated users" ON ai_roles
    FOR SELECT TO authenticated USING (true);

-- 允许匿名用户查看 AI 角色（用于公开展示）
CREATE POLICY "AI roles are viewable by anonymous users" ON ai_roles
    FOR SELECT TO anon USING (true);