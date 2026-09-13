--!strict
-- Per-player persistence.
--
-- One DataStore key per player, loaded on join, flushed on leave, autosaved on
-- a timer, and flushed again from BindToClose so a server shutdown does not eat
-- the last few minutes of progress. Every DataStore call is retried, and a
-- failed *load* is never treated as "new player" -- that is how save files get
-- wiped. Instead the profile is marked read-only for the session.

local DataStoreService = game:GetService("DataStoreService")
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))

local Save = {}

local RETRIES = 4
local profiles: { [Player]: any } = {}
local readOnly: { [Player]: boolean } = {}
local store: DataStore? = nil

local function defaults(): any
	return {
		coins = Settings.currency and Settings.currency.start or 0,
		checkpoint = 0,
		wins = 0,
		best = 0,
		purchases = {},
		version = 1,
	}
end

local function keyFor(player: Player): string
	return string.format("player_%d", player.UserId)
end

local function withRetries<T>(label: string, fn: (() -> T)): (boolean, T?)
	for attempt = 1, RETRIES do
		local ok, result = pcall(fn)
		if ok then
			return true, result
		end
		warn(string.format("[Forge] %s failed (attempt %d/%d): %s", label, attempt, RETRIES, tostring(result)))
		if attempt < RETRIES then
			task.wait(2 ^ attempt)
		end
	end
	return false, nil
end

-- Fill in keys added by later versions of the game without clobbering saves.
local function reconcile(data: any): any
	local base = defaults()
	if type(data) ~= "table" then
		return base
	end
	for key, value in pairs(base) do
		if data[key] == nil then
			data[key] = value
		end
	end
	return data
end

-- In Studio, DataStores only work with "Enable Studio Access to API Services"
-- switched on, so saving stays off there unless the project opts in.
function Save.isEnabled(): boolean
	if not Settings.save or Settings.save.enabled ~= true then
		return false
	end
	if RunService:IsStudio() and Settings.save.studio ~= true then
		return false
	end
	return true
end

function Save.load(player: Player)
	if profiles[player] then
		return profiles[player]
	end

	if not Save.isEnabled() then
		profiles[player] = defaults()
		readOnly[player] = true
		return profiles[player]
	end

	if not store then
		store = DataStoreService:GetDataStore(Settings.save.store or "ForgeSave_v1")
	end

	local ok, data = withRetries("load " .. player.Name, function()
		return (store :: DataStore):GetAsync(keyFor(player))
	end)

	if not ok then
		-- Could not read: play on a fresh profile, but never write it back.
		profiles[player] = defaults()
		readOnly[player] = true
		warn(string.format("[Forge] %s is playing read-only; their save could not be loaded", player.Name))
		return profiles[player]
	end

	profiles[player] = reconcile(data)
	return profiles[player]
end

-- Blocks until the profile exists. Safe to call from any system.
function Save.get(player: Player): any
	local waited = 0
	while not profiles[player] and player.Parent and waited < 30 do
		task.wait(0.1)
		waited += 0.1
	end
	return profiles[player] or defaults()
end

function Save.flush(player: Player)
	local profile = profiles[player]
	if not profile or readOnly[player] or not store then
		return
	end
	withRetries("save " .. player.Name, function()
		return (store :: DataStore):UpdateAsync(keyFor(player), function()
			return profile
		end)
	end)
end

function Save.release(player: Player)
	Save.flush(player)
	profiles[player] = nil
	readOnly[player] = nil
end

function Save.flushAll()
	for player in pairs(profiles) do
		Save.flush(player)
	end
end

function Save.start()
	for _, player in ipairs(Players:GetPlayers()) do
		task.spawn(Save.load, player)
	end
	Players.PlayerAdded:Connect(function(player)
		Save.load(player)
	end)
	Players.PlayerRemoving:Connect(function(player)
		Save.release(player)
	end)

	local interval = (Settings.save and Settings.save.autosaveSeconds) or 120
	task.spawn(function()
		while true do
			task.wait(interval)
			Save.flushAll()
		end
	end)

	game:BindToClose(function()
		Save.flushAll()
		-- Give the last writes a moment to land before the server dies.
		task.wait(2)
	end)
end

return Save
