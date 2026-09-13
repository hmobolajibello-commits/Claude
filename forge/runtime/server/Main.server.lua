--!strict
-- Entry point. Starts only the systems this game's Settings ask for, in
-- dependency order, and keeps one failing system from taking the rest down.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Modules = script.Parent:WaitForChild("Forge")

-- Save must come first: everything else reads profiles through it. Anything the
-- project added beyond these starts afterwards, in the order Settings lists it.
local ORDER = { "Save", "Leaderstats", "Economy", "Tags", "Shop", "Plots", "Rounds" }

local requested = {}
for _, name in ipairs(Settings.systems or {}) do
	requested[name] = true
end

local plan = {}
local queued = {}
for _, name in ipairs(ORDER) do
	if requested[name] then
		table.insert(plan, name)
		queued[name] = true
	end
end
for _, name in ipairs(Settings.systems or {}) do
	if not queued[name] then
		table.insert(plan, name)
		queued[name] = true
	end
end

print(string.format("[Forge] starting %s", Settings.name or "game"))

for _, name in ipairs(plan) do
	local moduleScript = Modules:FindFirstChild(name)
	if not moduleScript then
		warn(string.format("[Forge] system %q is listed in Settings but not present", name))
		continue
	end
	local ok, err = pcall(function()
		local system = require(moduleScript)
		if type(system) == "table" and type(system.start) == "function" then
			system.start()
		end
	end)
	if ok then
		print(string.format("[Forge] + %s", name))
	else
		warn(string.format("[Forge] %s failed to start: %s", name, tostring(err)))
	end
end

print("[Forge] ready")
