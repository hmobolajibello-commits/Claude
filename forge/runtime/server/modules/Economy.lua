--!strict
-- The single place currency changes. Everything else calls into here so the
-- profile, the leaderboard and the HUD can never drift apart.

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Net = require(Shared:WaitForChild("Net"))
local Save = require(script.Parent:WaitForChild("Save"))
local Leaderstats = require(script.Parent:WaitForChild("Leaderstats"))

local Economy = {}

local hudEvent = Net.event("Hud")
local notifyEvent = Net.event("Notify")

local function push(player: Player)
	local profile = Save.get(player)
	Leaderstats.sync(player)
	hudEvent:FireClient(player, {
		coins = profile.coins or 0,
		wins = profile.wins or 0,
		checkpoint = profile.checkpoint or 0,
		carried = profile.carried or 0,
	})
end

Economy.push = push

function Economy.notify(player: Player, message: string, tone: string?)
	notifyEvent:FireClient(player, message, tone or "info")
end

function Economy.balance(player: Player): number
	return Save.get(player).coins or 0
end

function Economy.award(player: Player, amount: number, reason: string?)
	if amount <= 0 then
		return
	end
	local profile = Save.get(player)
	local multiplier = (Settings.currency and Settings.currency.multiplier) or 1
	local gained = math.floor(amount * multiplier + 0.5)
	profile.coins = (profile.coins or 0) + gained
	push(player)
	if reason then
		Economy.notify(player, string.format("+%d %s -- %s", gained, Settings.currency.name, reason), "good")
	end
end

-- Returns false (and spends nothing) when the player cannot afford it.
function Economy.spend(player: Player, amount: number): boolean
	local profile = Save.get(player)
	if (profile.coins or 0) < amount then
		return false
	end
	profile.coins -= amount
	push(player)
	return true
end

function Economy.addWin(player: Player)
	local profile = Save.get(player)
	profile.wins = (profile.wins or 0) + 1
	push(player)
end

function Economy.start()
	local Players = game:GetService("Players")
	Players.PlayerAdded:Connect(function(player)
		task.delay(1, push, player)
	end)
	for _, player in ipairs(Players:GetPlayers()) do
		task.delay(1, push, player)
	end
end

return Economy
