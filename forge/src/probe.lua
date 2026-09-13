-- Publish check. forge runs this inside a real cloud server for the linked
-- place and reports what came back, so a deploy can be confirmed without
-- opening Studio.

local ReplicatedStorage = game:GetService("ReplicatedStorage")

local forge = ReplicatedStorage:FindFirstChild("Forge")
if not forge then
	return { ok = false, reason = "ReplicatedStorage.Forge is missing -- the place did not publish as expected" }
end

local settings = require(forge:WaitForChild("Settings"))
local mapData = require(forge:WaitForChild("MapData"))
local map = workspace:FindFirstChild("Map")

local tagged, missing = 0, {}
for name in pairs(mapData.parts) do
	tagged += 1
	if not (map and map:FindFirstChild(name, true)) then
		table.insert(missing, name)
	end
end

local bricks = 0
for _, descendant in ipairs(map and map:GetDescendants() or {}) do
	if descendant:IsA("BasePart") then
		bricks += 1
	end
end

local spawns = 0
for _, descendant in ipairs(workspace:GetDescendants()) do
	if descendant:IsA("SpawnLocation") then
		spawns += 1
	end
end

print(string.format("[probe] %s: %d bricks, %d tagged, %d spawns", settings.name, bricks, tagged, spawns))

return {
	ok = #missing == 0 and bricks > 0 and spawns > 0,
	game = settings.name,
	systems = settings.systems,
	bricks = bricks,
	tagged = tagged,
	spawns = spawns,
	missing = missing,
}
