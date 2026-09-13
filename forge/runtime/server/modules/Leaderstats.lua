--!strict
-- Mirrors the saved profile into the player list.

local Players = game:GetService("Players")

local Shared = game:GetService("ReplicatedStorage"):WaitForChild("Forge")
local Settings = require(Shared:WaitForChild("Settings"))
local Save = require(script.Parent:WaitForChild("Save"))

local Leaderstats = {}

local currencyName = (Settings.currency and Settings.currency.name) or "Coins"

local function build(player: Player)
	local profile = Save.get(player)

	local folder = Instance.new("Folder")
	folder.Name = "leaderstats"

	local currency = Instance.new("IntValue")
	currency.Name = currencyName
	currency.Value = profile.coins or 0
	currency.Parent = folder

	if Settings.showWins then
		local wins = Instance.new("IntValue")
		wins.Name = "Wins"
		wins.Value = profile.wins or 0
		wins.Parent = folder
	end

	folder.Parent = player
end

function Leaderstats.sync(player: Player)
	local folder = player:FindFirstChild("leaderstats")
	if not folder then
		return
	end
	local profile = Save.get(player)
	local currency = folder:FindFirstChild(currencyName)
	if currency and currency:IsA("IntValue") then
		currency.Value = profile.coins or 0
	end
	local wins = folder:FindFirstChild("Wins")
	if wins and wins:IsA("IntValue") then
		wins.Value = profile.wins or 0
	end
end

function Leaderstats.start()
	for _, player in ipairs(Players:GetPlayers()) do
		task.spawn(build, player)
	end
	Players.PlayerAdded:Connect(function(player)
		task.spawn(build, player)
	end)
end

return Leaderstats
