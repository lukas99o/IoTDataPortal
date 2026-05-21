FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app

COPY IoTDataPortal.slnx .
COPY IoTDataPortal.API/*.csproj ./IoTDataPortal.API/
COPY IoTDataPortal.Models/*.csproj ./IoTDataPortal.Models/
COPY IoTDataPortal.Tests/*.csproj ./IoTDataPortal.Tests/

RUN dotnet restore

COPY . .
RUN dotnet publish IoTDataPortal.API -c Release -o /app/publish

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .

ENTRYPOINT ["dotnet", "IoTDataPortal.API.dll"]